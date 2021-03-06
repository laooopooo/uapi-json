import moment from 'moment';
import _ from 'lodash';

import { parsers } from '../../utils';
import airService from './AirService';
import createTerminalService from '../Terminal/Terminal';
import { AirRuntimeError } from './AirErrors';

module.exports = (settings) => {
  const service = airService(settings);
  return {
    shop(options) {
      return service.searchLowFares(options);
    },

    toQueue(options) {
      return service.gdsQueue(options);
    },

    book(options) {
      return service.airPricePricingSolutionXML(options).then((data) => {
        const bookingParams = Object.assign({}, {
          ticketDate: moment().add(3, 'hours').format(),
          ActionStatusType: 'TAU',
        }, data, options);
        return service.createReservation(bookingParams).catch((err) => {
          if (err instanceof AirRuntimeError.SegmentBookingFailed
              || err instanceof AirRuntimeError.NoValidFare) {
            const code = err.data['universal:UniversalRecord'].LocatorCode;
            return service.cancelUR({
              LocatorCode: code,
            }).then(() => Promise.reject(err));
          }
          return Promise.reject(err);
        });
      });
    },

    importPNR(options) {
      return service.importPNR(options)
        .catch((err) => {
          // Checking for error type
          if (!(err instanceof AirRuntimeError.NoReservationToImport)) {
            return Promise.reject(err);
          }
          // Creating passive segment to import PNR
          const terminal = createTerminalService(settings);
          const segment = {
            date: moment().add(42, 'days').format('DDMMM'),
            airline: 'OK',
            from: 'DOH',
            to: 'ODM',
            comment: 'NO1',
            class: 'Y',
          };
          const segmentCommand = (
            `0${segment.airline}OPEN${segment.class}${segment.date}${segment.from}${segment.to}${segment.comment}`
          ).toUpperCase();
          const segmentResult = (
            `1. ${segment.airline} OPEN ${segment.class}  ${segment.date} ${segment.from}${segment.to} ${segment.comment}`
          ).toUpperCase();
          const pnrRegExp = new RegExp(`^(?:\\*\\* THIS BF IS CURRENTLY IN USE \\*\\*\\s*)?${options.pnr}`);
          return terminal.executeCommand(`*${options.pnr}`)
            .then((response) => {
              if (!response.match(pnrRegExp)) {
                return Promise.reject(new AirRuntimeError.UnableToOpenPNRInTerminal());
              }
              return Promise.resolve();
            })
            .then(() => terminal.executeCommand(segmentCommand))
            .then((response) => {
              if (response.indexOf(segmentResult) === -1) {
                return Promise.reject(new AirRuntimeError.UnableToAddExtraSegment());
              }
              return Promise.resolve();
            })
            .then(() => {
              const ticketingDate = moment().add(10, 'days').format('DDMMM');
              const command = `T.TAU/${ticketingDate}`;
              return terminal.executeCommand(command)
                .then(() => terminal.executeCommand('R.UAPI+ER'))
                .then(() => terminal.executeCommand('ER'));
            })
            .then((response) => {
              if (
                (!response.match(pnrRegExp)) ||
                (response.indexOf(segmentResult) === -1)
              ) {
                return Promise.reject(new AirRuntimeError.UnableToSaveBookingWithExtraSegment());
              }
              return Promise.resolve();
            })
            .catch(
              importErr => terminal.closeSession().then(
                () => Promise.reject(
                  new AirRuntimeError.UnableToImportPnr(options, importErr)
                )
              )
            )
            .then(() => terminal.closeSession())
            .then(() => service.importPNR(options))
            .then(pnrData => service.cancelPNR(pnrData[0]))
            .then(() => service.importPNR(options));
        });
    },

    ticket(options) {
      return this.importPNR(options).then((data) => {
        const ticketParams = Object.assign({}, options, {
          ReservationLocator: data[0].uapi_reservation_locator,
        });
        return service.ticket(ticketParams)
          .then(result => result, (err) => {
            if (err instanceof AirRuntimeError.TicketingFoidRequired) {
              return this.importPNR(options)
                .then(booking => service.foid(booking[0]))
                .then(() => service.ticket(ticketParams));
            }
            return Promise.reject(err);
          });
      });
    },

    flightInfo(options) {
      const parameters = {
        flightInfoCriteria: _.isArray(options) ? options : [options],
      };
      return service.flightInfo(parameters);
    },

    getTicket(options) {
      return service.getTicket(options)
        .catch((err) => {
          if (!(err instanceof AirRuntimeError.TicketInfoIncomplete)
            && !(err instanceof AirRuntimeError.DuplicateTicketFound)) {
            return Promise.reject(err);
          }
          return this.getPNRByTicketNumber({
            ticketNumber: options.ticketNumber,
          })
            .then(pnr => this.importPNR({ pnr }))
            .then(ur => service.getTicket({
              ...options,
              pnr: ur[0].pnr,
              uapi_ur_locator: ur[0].uapi_ur_locator,
            }));
        });
    },

    getPNRByTicketNumber(options) {
      const terminal = createTerminalService(settings);
      return terminal.executeCommand(`*TE/${options.ticketNumber}`)
        .then(
          response => terminal.closeSession()
            .then(() => response.match(/RLOC [^\s]{2} ([^\s]{6})/)[1])
            .catch(() => Promise.reject(new AirRuntimeError.PnrParseError(response)))
        )
        .catch(
          err => Promise.reject(new AirRuntimeError.GetPnrError(options, err))
        );
    },

    getTickets(options) {
      return this.importPNR(options)
        .then(
           pnrData => Promise.all(
             pnrData[0].tickets.map(
               ticket => this.getTicket({
                 pnr: pnrData[0].pnr,
                 uapi_ur_locator: pnrData[0].uapi_ur_locator,
                 ticketNumber: ticket.number,
               })
             )
           )
        )
        .catch(
          err => Promise.reject(new AirRuntimeError.UnableToRetrieveTickets(options, err))
        );
    },

    searchBookingsByPassengerName(options) {
      const terminal = createTerminalService(settings);
      return terminal.executeCommand(`*-${options.searchPhrase}`)
        .then((firstScreen) => {
          const list = parsers.searchPassengersList(firstScreen);
          if (list) {
            return Promise
              .all(list.map((line) => {
                const localTerminal = createTerminalService(settings);
                return localTerminal
                  .executeCommand(`*-${options.searchPhrase}`)
                  .then((firstScreenAgain) => {
                    if (firstScreenAgain !== firstScreen) {
                      return Promise.reject(
                        new AirRuntimeError.RequestInconsistency({
                          firstScreen,
                          firstScreenAgain,
                        })
                      );
                    }

                    return localTerminal.executeCommand(`*${line.id}`);
                  })
                  .then(parsers.bookingPnr)
                  .then(pnr => localTerminal.closeSession()
                    .then(() => ({ ...line, pnr }))
                  );
              }))
              .then(data => ({ type: 'list', data }));
          }

          const pnr = parsers.bookingPnr(firstScreen);
          if (pnr) {
            return {
              type: 'pnr',
              data: pnr,
            };
          }

          return Promise.reject(
            new AirRuntimeError.MissingPaxListAndBooking(firstScreen)
          );
        })
        .then(results =>
          terminal.closeSession()
            .then(() => results)
            .catch(() => results)
        );
    },

    cancelTicket(options) {
      return this.getTicket(options)
        .then(
          ticketData => service.cancelTicket({
            pnr: ticketData.pnr,
            ticketNumber: options.ticketNumber,
          })
        )
        .catch(
          err => Promise.reject(new AirRuntimeError.FailedToCancelTicket(options, err))
        );
    },

    cancelPNR(options) {
      return this.getTickets(options)
        .then(
          tickets => Promise.all(tickets.map(
            (ticketData) => {
              // Check for VOID
              const allTicketsVoid = ticketData.tickets.every(
                ticket => ticket.coupons.every(
                  coupon => coupon.status === 'V'
                )
              );
              if (allTicketsVoid) {
                return Promise.resolve(true);
              }
              // Check for cancelTicket option
              if (options.cancelTickets !== true) {
                return Promise.reject(new AirRuntimeError.PNRHasOpenTickets());
              }
              // Check for not OPEN/VOID segments
              const hasNotOpenSegment = ticketData.tickets.some(
                ticket => ticket.coupons.some(
                  coupon => 'OV'.indexOf(coupon.status) === -1
                )
              );
              if (hasNotOpenSegment) {
                return Promise.reject(new AirRuntimeError.UnableToCancelTicketStatusNotOpen());
              }
              return Promise.all(
                ticketData.tickets.map(
                  ticket => (
                    ticket.coupons[0].status !== 'V' ? service.cancelTicket({
                      pnr: options.pnr,
                      ticketNumber: ticket.ticketNumber,
                    }) : Promise.resolve(true)
                  )
                )
              );
            }
          ))
        )
        .then(() => this.importPNR(options))
        .then(pnrData => service.cancelPNR(pnrData[0]))
        .catch(
          err => Promise.reject(new AirRuntimeError.FailedToCancelPnr(options, err))
        );
    },


    getExchangeInformation(options) {
      return this.importPNR(options)
        .then((importResponse) => {
          const [booking] = importResponse;
          return service.exchangeQuote({
            ...options,
            bookingDate: moment(booking.createdAt).format('YYYY-MM-DD'),
          });
        });
    },

    exchangeBooking(options) {
      return this.importPNR(options)
        .then((importResponse) => {
          const [booking] = importResponse;
          return service.exchangeBooking({
            ...options,
            uapi_reservation_locator: booking.uapi_reservation_locator,
          });
        });
    },
  };
};
