import fs from 'fs';
import path from 'path';
import chai from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import moment from 'moment';
import { AirRuntimeError } from '../../src/Services/Air/AirErrors';

const expect = chai.expect;
chai.use(sinonChai);

const responsesDir = path.join(__dirname, '..', 'FakeResponses', 'Air');
const terminalResponsesDir = path.join(__dirname, '..', 'FakeResponses', 'Terminal');
const auth = {
  username: 'USERNAME',
  password: 'PASSWORD',
  targetBranch: 'BRANCH',
};


describe('#AirService', () => {
  describe('shop', () => {
    it('should check if correct function from service is called', () => {
      const searchLowFares = sinon.spy(() => {});
      const service = () => ({ searchLowFares });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });
      createAirService({ auth }).shop({});
      expect(searchLowFares.calledOnce).to.be.equal(true);
    });
  });

  describe('toQueue', () => {
    it('should check if correct function from service is called', () => {
      const gdsQueue = sinon.spy(() => {});
      const service = () => ({ gdsQueue });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });
      createAirService({ auth }).toQueue({});
      expect(gdsQueue.calledOnce).to.be.equal(true);
    });
  });

  describe('book', () => {
    it('should check if correct function from service is called', () => {
      const params = {
        passengers: [],
        rule: 'RULE',
      };

      const airPricePricingSolutionXML = sinon.spy(
        () => Promise.resolve({ foo: 123 })
      );
      const createReservation = sinon.spy((options) => {
        expect(options.foo).to.be.equal(123);
        expect(options.ActionStatusType).to.be.equal('TAU');
        expect(options.rule).to.be.equal(params.rule);
        expect(options.passengers).to.be.equal(params.passengers);
        return Promise.resolve();
      });
      const cancelUR = sinon.spy(() => {});
      const service = () => ({ airPricePricingSolutionXML, createReservation });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService({ auth }).book(params).then(() => {
        expect(airPricePricingSolutionXML.calledOnce).to.be.equal(true);
        expect(createReservation.calledOnce).to.be.equal(true);
        expect(cancelUR.calledOnce).to.be.equal(false);
      });
    });

    it('should call cancel ur if no valid fare', () => {
      const params = { passengers: [], rule: 'RULE' };
      const airPricePricingSolutionXML = sinon.spy(
        () => Promise.resolve({ foo: 123 })
      );
      const createReservation = sinon.spy(() =>
        Promise.reject(new AirRuntimeError.NoValidFare({
          'universal:UniversalRecord': { LocatorCode: 123 },
        }))
      );
      const cancelUR = sinon.spy((options) => {
        expect(options.LocatorCode).to.be.equal(123);
        return Promise.resolve();
      });
      const service = () => ({
        airPricePricingSolutionXML,
        createReservation,
        cancelUR,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService({ auth }).book(params).then(() => {
        expect(airPricePricingSolutionXML.calledOnce).to.be.equal(true);
        expect(createReservation.calledOnce).to.be.equal(true);
        expect(cancelUR.calledOnce).to.be.equal(true);
      })
        .then(() => {
          throw new Error('Cant be success.');
        })
        .catch((err) => {
          expect(err).to.be.instanceof(AirRuntimeError.NoValidFare);
        });
    });

    it('should call cancel ur if segment booking failed', () => {
      const params = { passengers: [], rule: 'RULE' };
      const airPricePricingSolutionXML = sinon.spy(
        () => Promise.resolve({ foo: 123 })
      );
      const createReservation = sinon.spy(() =>
        Promise.reject(new AirRuntimeError.SegmentBookingFailed({
          'universal:UniversalRecord': { LocatorCode: 123 },
        }))
      );
      const cancelUR = sinon.spy((options) => {
        expect(options.LocatorCode).to.be.equal(123);
        return Promise.resolve();
      });
      const service = () => ({
        airPricePricingSolutionXML,
        createReservation,
        cancelUR,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService({ auth }).book(params).then(() => {
        expect(airPricePricingSolutionXML.calledOnce).to.be.equal(true);
        expect(createReservation.calledOnce).to.be.equal(true);
        expect(cancelUR.calledOnce).to.be.equal(true);
      })
        .then(() => {
          throw new Error('Cant be success.');
        })
        .catch((err) => {
          expect(err).to.be.instanceof(AirRuntimeError.SegmentBookingFailed);
        });
    });

    it('should not call cancel ur if other error', () => {
      const params = { passengers: [], rule: 'RULE' };
      const airPricePricingSolutionXML = sinon.spy(
        () => Promise.resolve({ foo: 123 })
      );
      const createReservation = sinon.spy(() =>
        Promise.reject(new AirRuntimeError.TicketingFailed({
          'universal:UniversalRecord': { LocatorCode: 123 },
        }))
      );
      const cancelUR = sinon.spy((options) => {
        expect(options.LocatorCode).to.be.equal(123);
        return Promise.resolve();
      });
      const service = () => ({
        airPricePricingSolutionXML,
        createReservation,
        cancelUR,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService({ auth }).book(params).then(() => {
        expect(airPricePricingSolutionXML.calledOnce).to.be.equal(true);
        expect(createReservation.calledOnce).to.be.equal(true);
        expect(cancelUR.calledOnce).to.be.equal(true);
      })
        .then(() => {
          throw new Error('Cant be success.');
        })
        .catch((err) => {
          expect(err).to.be.instanceof(AirRuntimeError.TicketingFailed);
        });
    });
  });

  describe('importPNR', () => {
    const params = {
      pnr: 'PNR001',
    };
    const segment = {
      date: moment().add(42, 'days').format('DDMMM'),
      airline: 'OK',
      from: 'DOH',
      to: 'ODM',
      comment: 'NO1',
      class: 'Y',
    };
    const pnrString = `${params.pnr}/`;
    const segmentResult = (
      `1. ${segment.airline} OPEN ${segment.class}  ${segment.date} ${segment.from}${segment.to} ${segment.comment}`
    ).toUpperCase();

    it('should check if correct function from service is called', () => {
      const importPNR = sinon.spy(() => Promise.resolve({}));
      const airService = () => ({ importPNR });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });
      return createAirService({ auth })
        .importPNR(params)
        .then(() => {
          expect(importPNR).to.have.callCount(1);
        });
    });
    it('should throw an error when something is wrong in parser', () => {
      const error = new Error('Some error');
      const importPNR = sinon.spy(() => Promise.reject(error));

      const airService = () => ({ importPNR });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });
      return createAirService({ auth })
        .importPNR(params)
        .catch((importError) => {
          expect(importError).to.equal(error);
        });
    });
    it('should throw an error when it is unable to open PNR in rerminal', () => {
      const importPNR = sinon.spy(
        () => Promise.reject(new AirRuntimeError.NoReservationToImport())
      );
      const executeCommand = sinon.stub();
      executeCommand.onCall(0).returns(
        Promise.resolve('FINISH OR IGNORE')
      );
      const closeSession = sinon.spy(
        () => Promise.resolve(true)
      );

      // Services
      const airService = () => ({
        importPNR,
      });
      const terminalService = () => ({
        executeCommand,
        closeSession,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
        '../Terminal/Terminal': terminalService,
      });

      return createAirService()
        .importPNR(params)
        .catch((error) => {
          expect(error).to.be.an.instanceOf(AirRuntimeError.UnableToImportPnr);
          expect(error.causedBy).to.be.an.instanceOf(AirRuntimeError.UnableToOpenPNRInTerminal);
          expect(importPNR).to.have.callCount(1);
          expect(executeCommand).to.have.callCount(1);
          expect(closeSession).to.have.callCount(1);
        });
    });
    it('should throw an error when it is unable to add an extra segment', () => {
      const importPNR = sinon.spy(
        () => Promise.reject(new AirRuntimeError.NoReservationToImport())
      );
      const executeCommand = sinon.stub();
      executeCommand.onCall(0).returns(
        Promise.resolve(pnrString)
      );
      executeCommand.onCall(1).returns(
        Promise.resolve('ERR: FORMAT')
      );
      const closeSession = sinon.spy(
        () => Promise.resolve(true)
      );

      // Services
      const airService = () => ({
        importPNR,
      });
      const terminalService = () => ({
        executeCommand,
        closeSession,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
        '../Terminal/Terminal': terminalService,
      });

      return createAirService().importPNR(params)
        .catch((error) => {
          expect(error).to.be.an.instanceOf(AirRuntimeError.UnableToImportPnr);
          expect(error.causedBy).to.be.an.instanceOf(AirRuntimeError.UnableToAddExtraSegment);
          expect(importPNR).to.have.callCount(1);
          expect(executeCommand).to.have.callCount(2);
          expect(closeSession).to.have.callCount(1);
        });
    });
    it('should throw an error when it is unable to add an extra segment (no segment added)', () => {
      const importPNR = sinon.spy(
        () => Promise.reject(new AirRuntimeError.NoReservationToImport())
      );
      const executeCommand = sinon.stub();
      executeCommand.onCall(0).returns(
        Promise.resolve(pnrString)
      );
      executeCommand.onCall(1).returns(
        Promise.resolve(segmentResult)
      );
      executeCommand.onCall(2).returns(
        Promise.resolve(true)
      );
      executeCommand.onCall(3).returns(
        Promise.resolve(true)
      );
      executeCommand.onCall(4).returns(
        Promise.resolve([
          pnrString,
        ].join('\n'))
      );
      const closeSession = sinon.spy(
        () => Promise.resolve(true)
      );

      // Services
      const airService = () => ({
        importPNR,
      });
      const terminalService = () => ({
        executeCommand,
        closeSession,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
        '../Terminal/Terminal': terminalService,
      });

      return createAirService().importPNR(params)
        .catch((error) => {
          expect(error).to.be.an.instanceOf(AirRuntimeError.UnableToImportPnr);
          expect(error.causedBy).to.be.an.instanceOf(
            AirRuntimeError.UnableToSaveBookingWithExtraSegment
          );
          expect(importPNR).to.have.callCount(1);
          expect(executeCommand).to.have.callCount(5);
          expect(closeSession).to.have.callCount(1);
        });
    });
    it('should throw an error when it is unable to add an extra segment (no PNR parsed)', () => {
      const importPNR = sinon.spy(
        () => Promise.reject(new AirRuntimeError.NoReservationToImport())
      );
      const executeCommand = sinon.stub();
      executeCommand.onCall(0).returns(
        Promise.resolve(pnrString)
      );
      executeCommand.onCall(1).returns(
        Promise.resolve(segmentResult)
      );
      executeCommand.onCall(2).returns(
        Promise.resolve(true)
      );
      executeCommand.onCall(3).returns(
        Promise.resolve(true)
      );
      executeCommand.onCall(4).returns(
        Promise.resolve([
          segmentResult,
        ].join('\n'))
      );
      const closeSession = sinon.spy(
        () => Promise.resolve(true)
      );

      // Services
      const airService = () => ({
        importPNR,
      });
      const terminalService = () => ({
        executeCommand,
        closeSession,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
        '../Terminal/Terminal': terminalService,
      });

      return createAirService().importPNR(params)
        .catch((error) => {
          expect(error).to.be.an.instanceOf(AirRuntimeError.UnableToImportPnr);
          expect(error.causedBy).to.be.an.instanceOf(
            AirRuntimeError.UnableToSaveBookingWithExtraSegment
          );
          expect(importPNR).to.have.callCount(1);
          expect(executeCommand).to.have.callCount(5);
          expect(closeSession).to.have.callCount(1);
        });
    });

    it('should run to the end if everything is OK', () => {
      const importPNR = sinon.stub();
      importPNR.onCall(0).returns(Promise.reject(new AirRuntimeError.NoReservationToImport()));
      importPNR.onCall(1).returns(Promise.resolve([true]));
      importPNR.onCall(2).returns(Promise.resolve([true]));
      const cancelPNR = sinon.spy(() => Promise.resolve(true));
      const executeCommand = sinon.stub();
      executeCommand.onCall(0).returns(
        Promise.resolve(pnrString)
      );
      executeCommand.onCall(1).returns(
        Promise.resolve(segmentResult)
      );
      executeCommand.onCall(2).returns(
        Promise.resolve(true)
      );
      executeCommand.onCall(3).returns(
        Promise.resolve(true)
      );
      executeCommand.onCall(4).returns(
        Promise.resolve([
          pnrString,
          segmentResult,
        ].join('\n'))
      );
      const closeSession = sinon.spy(
        () => Promise.resolve(true)
      );

      // Services
      const airService = () => ({
        importPNR,
        cancelPNR,
      });
      const terminalService = () => ({
        executeCommand,
        closeSession,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
        '../Terminal/Terminal': terminalService,
      });

      return createAirService().importPNR(params)
        .catch((error) => {
          expect(error).to.be.an.instanceOf(AirRuntimeError.UnableToImportPnr);
          expect(error.causedBy).to.be.an.instanceOf(
            AirRuntimeError.UnableToSaveBookingWithExtraSegment
          );
          expect(importPNR).to.have.callCount(1);
          expect(executeCommand).to.have.callCount(5);
          expect(closeSession).to.have.callCount(1);
        });
    });
  });

  describe('ticket', () => {
    it('should check if correct function from service is called', () => {
      const params = { PNR: '123456' };

      const importPNR = sinon.spy(
        () => Promise.resolve([{ uapi_reservation_locator: 'ABCDEF' }])
      );
      const ticket = sinon.spy((options) => {
        expect(options.ReservationLocator).to.be.equal('ABCDEF');
        return Promise.resolve();
      });
      const foid = sinon.spy(() => {});
      const service = () => ({ importPNR, ticket, foid });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService({ auth }).ticket(params).then(() => {
        expect(importPNR.calledOnce).to.be.equal(true);
        expect(ticket.calledOnce).to.be.equal(true);
        expect(foid.calledOnce).to.be.equal(false);
      });
    });

    it('should resolve foid and reticket', () => {
      const params = { PNR: '123456' };

      const importPNR = sinon.spy(
        () => Promise.resolve([{ uapi_reservation_locator: 'ABCDEF' }])
      );
      const ticketResponses = [
        Promise.resolve(),
        Promise.reject(new AirRuntimeError.TicketingFoidRequired([1])),
      ];

      const ticket = sinon.spy((options) => {
        expect(options.ReservationLocator).to.be.equal('ABCDEF');
        return ticketResponses.pop();
      });

      const foid = sinon.spy(() => {});
      const service = () => ({ importPNR, ticket, foid });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService({ auth }).ticket(params).then(() => {
        throw new Error('Cant be successfull');
      }).catch(() => {
        expect(importPNR.calledTwice).to.be.equal(true);
        expect(ticket.calledTwice).to.be.equal(true);
        expect(foid.calledOnce).to.be.equal(true);
      });
    });

    it('should resolve rethrow other errors', () => {
      const params = { PNR: '123456' };

      const importPNR = sinon.spy(
        () => Promise.resolve([{ uapi_reservation_locator: 'ABCDEF' }])
      );
      const ticketResponses = [
        Promise.reject(new AirRuntimeError.NoValidFare()),
      ];

      const ticket = sinon.spy((options) => {
        expect(options.ReservationLocator).to.be.equal('ABCDEF');
        return ticketResponses.pop();
      });

      const foid = sinon.spy(() => {});
      const service = () => ({ importPNR, ticket, foid });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService({ auth }).ticket(params).then(() => {
        throw new Error('Cant be successfull');
      }).catch(() => {
        expect(importPNR.calledOnce).to.be.equal(true);
        expect(ticket.calledOnce).to.be.equal(true);
        expect(foid.calledOnce).to.be.equal(false);
      });
    });
  });

  describe('flightInfo', () => {
    it('should check if correct function from service is called', () => {
      const flightInfo = sinon.spy((options) => {
        expect(options.flightInfoCriteria).to.be.an('array');
      });

      const service = () => ({ flightInfo });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });
      createAirService({ auth }).flightInfo({});
      expect(flightInfo.calledOnce).to.be.equal(true);
    });

    it('should check if correct function from service is called with array params', () => {
      const flightInfo = sinon.spy((options) => {
        expect(options.flightInfoCriteria).to.be.an('array');
      });

      const service = () => ({ flightInfo });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });
      createAirService({ auth }).flightInfo([{}]);
      expect(flightInfo.calledOnce).to.be.equal(true);
    });
  });

  describe('getTicket', () => {
    it('should fail when no itinerary present to import', () => {
      const AirService = () => ({
        getTicket: () => Promise.reject(new AirRuntimeError.TicketInfoIncomplete()),
        importPNR: () => Promise.reject(new AirRuntimeError()),
      });
      const createTerminalService = () => ({
        executeCommand: () => Promise.resolve('RLOC 1G PNR001'),
        closeSession: () => Promise.resolve(true),
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': AirService,
        '../Terminal/Terminal': createTerminalService,
      });
      const service = createAirService({ auth });
      service.getTicket({ ticketNumber: '0649902789376' })
        .then(() => Promise.reject(new Error('Error has not occured')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError);
        });
    });

    it('should test if getPNRByTicketNumber is called when not complete', () => {
      const params = { ticketNumber: 123 };

      const getTicketResults = [
        Promise.resolve(),
        Promise.reject(new AirRuntimeError.TicketInfoIncomplete()),
      ];

      const getTicket = sinon.spy(() => getTicketResults.pop());

      const getPNRByTicketNumber = sinon.spy((options) => {
        expect(options.ticketNumber).to.be.equal(123);
        return Promise.resolve('PNR');
      });

      const importPNR = sinon.spy((options) => {
        expect(options.pnr).to.be.equal('PNR');
        return Promise.resolve([params]);
      });

      const service = () => ({
        getTicket,
        importPNR,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      const AirService = createAirService({ auth });
      AirService.getPNRByTicketNumber = getPNRByTicketNumber.bind(AirService);
      AirService.importPNR = importPNR.bind(AirService);

      return AirService.getTicket(params).then(() => {
        expect(getTicket.calledTwice).to.be.equal(true);
        expect(getPNRByTicketNumber.calledOnce).to.be.equal(true);
        expect(importPNR.calledOnce).to.be.equal(true);
      });
    });
  });

  describe('getPNRByTicketNumber', () => {
    it('should fail when ticket data not available by ticket number', (done) => {
      const response = fs.readFileSync(
        path.join(terminalResponsesDir, 'getTicketNotExists.txt')
      ).toString();
      const createTerminalService = () => ({
        // The only command is executed, no analyze needed
        executeCommand: () => Promise.resolve(response),
        closeSession: () => Promise.resolve(true),
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        '../Terminal/Terminal': createTerminalService,
      });
      const service = createAirService({ auth });
      service.getPNRByTicketNumber({ ticketNumber: '0649902789000' })
        .then(() => done(new Error('Error has not occured')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.GetPnrError);
          expect(err.causedBy).to.be.an.instanceof(AirRuntimeError.PnrParseError);
          done();
        });
    });
    it('should fail when something fails in executeCommand', (done) => {
      const createTerminalService = () => ({
        // The only command is executed, no analyze needed
        executeCommand: () => Promise.reject(new Error('Some error')),
        closeSession: () => Promise.resolve(true),
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        '../Terminal/Terminal': createTerminalService,
      });
      const service = createAirService({ auth });
      service.getPNRByTicketNumber({ ticketNumber: '0649902789000' })
        .then(() => done(new Error('Error has not occured')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.GetPnrError);
          expect(err.causedBy).to.be.an.instanceof(Error);
          done();
        });
    });
    it('should fail when something fails in closeSession', (done) => {
      const createTerminalService = () => ({
        // The only command is executed, no analyze needed
        executeCommand: () => Promise.resolve(true),
        closeSession: () => Promise.reject(new Error('Some error')),
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        '../Terminal/Terminal': createTerminalService,
      });
      const service = createAirService({ auth });
      service.getPNRByTicketNumber({ ticketNumber: '0649902789000' })
        .then(() => done(new Error('Error has not occured')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(Error);
          done();
        });
    });
    it('should fail when no TerminalService enabled for uAPI credentials');
    it('should return PNR when response is OK', (done) => {
      const response = fs.readFileSync(
        path.join(terminalResponsesDir, 'getTicketVoid.txt')
      ).toString();
      const createTerminalService = () => ({
        // The only command is executed, no analyze needed
        executeCommand: () => Promise.resolve(response),
        closeSession: () => Promise.resolve(true),
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        '../Terminal/Terminal': createTerminalService,
      });
      const service = createAirService({ auth });
      service.getPNRByTicketNumber({ ticketNumber: '0649902789376' })
        .then((pnr) => {
          expect(pnr).to.equal('8167L2');
          done();
        })
        .catch(err => done(err));
    });
  });

  describe('getTickets', () => {
    it('should throw an error when some function fails', (done) => {
      const AirService = () => ({
        importPNR: () => Promise.reject(new Error('Some error')),
        getTicket: () => Promise.reject(new Error('Some error')),
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': AirService,
      });
      const service = createAirService({ auth });
      service.getTickets({ pnr: 'PNR001' })
        .then(() => done(new Error('Error has not occured')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.UnableToRetrieveTickets);
          expect(err.causedBy).to.be.an.instanceof(Error);
          done();
        });
    });
    it('should work with right responses', (done) => {
      const importPNRVoidResponse = JSON.parse(
        fs.readFileSync(path.join(responsesDir, 'importPNR_VOID.json')).toString()
      );
      const getTicketVoidResponse = JSON.parse(
        fs.readFileSync(path.join(responsesDir, 'getTicket_VOID.json')).toString()
      );
      const AirService = () => ({
        importPNR: () => Promise.resolve(importPNRVoidResponse),
        getTicket: () => Promise.resolve(getTicketVoidResponse),
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': AirService,
      });
      const service = createAirService({ auth });
      service.getTickets({ pnr: 'PNR001' })
        .then((response) => {
          expect(response).to.be.an('array');
        })
        .then(done)
        .catch(err => done(err.causedBy));
    });
  });

  describe('searchBookingsByPassengerName', () => {
    it('should check if list correctly parsed', () => {
      const returnList = sinon.spy(() => Promise.resolve('listscreen'));
      const returnBooking = sinon.spy(() => Promise.resolve('pnrscreen'));

      const executeCommand = sinon.spy((command) => {
        expect(command).to.be.a('string');
        expect(command.match(/\*-?.*/)).to.be.not.equal(null);
        if (command[1] === '-') {
          return returnList();
        }
        return returnBooking();
      });

      const closeSession = sinon.spy(() => Promise.resolve());

      const bookingPnr = sinon.spy(
        screen => ((screen === 'pnrscreen') ? '123QWE' : null)
      );

      const searchPassengersList = sinon.spy(
        screen => (
          (screen === 'listscreen')
          ? [{ id: 1, name: 'first' }, { id: 2, name: 'last' }]
          : null
        ),
      );


      const createAirService = proxyquire('../../src/Services/Air/Air', {
        '../../utils': {
          parsers: {
            bookingPnr,
            searchPassengersList,
          },
        },
        '../Terminal/Terminal': () => ({
          executeCommand,
          closeSession,
        }),
      });

      return createAirService({ auth })
        .searchBookingsByPassengerName({ searchPhrase: 'OK' })
        .then((res) => {
          expect(res.type).to.be.equal('list');
          expect(res.data.length).to.be.equal(2);
          expect(res.data[0].pnr).to.be.equal('123QWE');
          expect(res.data[0].name).to.be.equal('first');
          expect(returnList.callCount).to.be.equal(3);
          expect(bookingPnr.callCount).to.be.equal(2);
          expect(searchPassengersList.callCount).to.be.equal(1);
          expect(returnBooking.calledTwice).to.be.equal(true);
          expect(executeCommand.callCount).to.be.equal(5);
          expect(closeSession.callCount).to.be.equal(3);
        });
    });

    it('should check if pnr parsed when list is null', () => {
      const returnBooking = sinon.spy(() => Promise.resolve('pnrscreen'));
      const executeCommand = sinon.spy(() => returnBooking());

      const bookingPnr = sinon.spy(
        screen => ((screen === 'pnrscreen') ? '123QWE' : null)
      );

      const searchPassengersList = sinon.spy(
        screen => (
          (screen === 'listscreen')
          ? [{ id: 1, name: 'first' }, { id: 2, name: 'last' }]
          : null
        ),
      );


      const createAirService = proxyquire('../../src/Services/Air/Air', {
        '../../utils': {
          parsers: {
            bookingPnr,
            searchPassengersList,
          },
        },
        '../Terminal/Terminal': () => ({
          executeCommand,
          closeSession: () => Promise.resolve(),
        }),
      });

      return createAirService({ auth })
        .searchBookingsByPassengerName({ searchPhrase: 'OK' })
        .then((res) => {
          expect(res.type).to.be.equal('pnr');
          expect(res.data).to.be.equal('123QWE');
          expect(bookingPnr.callCount).to.be.equal(1);
          expect(searchPassengersList.callCount).to.be.equal(1);
          expect(returnBooking.calledOnce).to.be.equal(true);
          expect(executeCommand.calledOnce).to.be.equal(true);
        });
    });

    it('should check if pnr parsed when list is null', () => {
      const returnList = sinon.spy(() => Promise.resolve({}));
      const executeCommand = sinon.spy(() => returnList());

      const parseAny = () => [{ id: 1, name: 'first' }, { id: 2, name: 'last' }];

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        '../../utils': {
          parsers: {
            bookingPnr: parseAny,
            searchPassengersList: parseAny,
          },
        },
        '../Terminal/Terminal': () => ({
          executeCommand,
          closeSession: () => Promise.resolve(),
        }),
      });

      return createAirService({ auth })
        .searchBookingsByPassengerName({ searchPhrase: 'OK' })
        .then(() => Promise.reject(new Error('Cant be answer.')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.RequestInconsistency);
        });
    });
  });

  describe('cancelTicket', () => {
    it('should throw a general error', () => {
      const service = () => ({
        getTicket: () => Promise.reject(new Error('Some error')),
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': service,
      });

      return createAirService().cancelTicket()
        .then(() => Promise.reject(new Error('Error has not occured')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.FailedToCancelTicket);
          expect(err.causedBy).to.be.an.instanceof(Error);
        });
    });
    it('should cancel ticket if info is complete', () => {
      // Spies
      const getTicket = sinon.spy(() => Promise.resolve({
        pnr: 'PNR001',
        ticketNumber: '1234567890123',
      }));
      const cancelTicket = sinon.spy(() => Promise.resolve(true));
      // Services
      const airService = () => ({
        getTicket,
        cancelTicket,
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      const service = createAirService();

      return service.cancelTicket({
        ticketNumber: '1234567890123',
      })
        .then(() => {
          expect(getTicket).to.have.callCount(1);
          expect(cancelTicket).to.have.callCount(1);
        });
    });
    it('should get ticket data if incomplete and be OK', () => {
      // Get ticket stub to return 2 different values on different calls
      const getTicket = sinon.stub();
      getTicket.onCall(0).returns(
        Promise.reject(new AirRuntimeError.TicketInfoIncomplete())
      );
      getTicket.onCall(1).returns(
        Promise.resolve({
          pnr: 'PNR001',
          ticketNumber: '1234567890123',
        })
      );
      // Spies
      const cancelTicket = sinon.spy(() => Promise.resolve(true));
      const importPNR = sinon.spy(() => Promise.resolve([{}]));
      const executeCommand = sinon.spy(() => Promise.resolve('RLOC 1G PNR001'));
      const closeSession = sinon.spy(() => Promise.resolve(true));
      // Services
      const airService = () => ({
        getTicket,
        cancelTicket,
        importPNR,
      });
      const terminalService = () => ({
        executeCommand,
        closeSession,
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
        '../Terminal/Terminal': terminalService,
      });

      const service = createAirService();

      return service.cancelTicket({
        ticketNumber: '1234567890123',
      })
        .then(() => {
          expect(getTicket).to.have.callCount(2);
          expect(cancelTicket).to.have.callCount(1);
          expect(importPNR).to.have.callCount(1);
          expect(executeCommand).to.have.callCount(1);
          expect(closeSession).to.have.callCount(1);
        });
    });
  });
  describe('cancelPNR', () => {
    it('should throw general error', () => {
      const airService = () => ({
        importPNR: () => Promise.reject(new Error('Some error')),
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      return createAirService().cancelPNR({
        pnr: 'PNR001',
      })
        .then(() => Promise.reject(new Error('Error has not occured')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.FailedToCancelPnr);
          expect(err.causedBy).to.be.an.instanceof(Error);
        });
    });
    it('should cancel PNR if no tickets available', () => {
      // Spies
      const importPNR = sinon.spy(() => Promise.resolve([{
        tickets: [],
      }]));
      const cancelPNR = sinon.spy(() => Promise.resolve(true));
      const getTicket = sinon.spy(() => Promise.resolve({
        coupons: [],
      }));

      // Services
      const airService = () => ({
        importPNR,
        getTicket,
        cancelPNR,
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      return createAirService().cancelPNR({
        pnr: 'PNR001',
      })
        .then(() => {
          expect(importPNR).to.have.callCount(2);
          expect(getTicket).to.have.callCount(0);
          expect(cancelPNR).to.have.callCount(1);
        });
    });
    it('should cancel PNR if tickets have only VOID coupons', () => {
      // Spies
      const importPNR = sinon.spy(() => Promise.resolve([{
        tickets: [
          '1234567890123',
        ],
      }]));
      const cancelPNR = sinon.spy(() => Promise.resolve(true));
      const getTicket = sinon.spy(() => Promise.resolve({
        tickets: [{
          coupons: [{
            status: 'V',
          }, {
            status: 'V',
          }],
        }],
      }));

      // Services
      const airService = () => ({
        importPNR,
        getTicket,
        cancelPNR,
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      return createAirService().cancelPNR({
        pnr: 'PNR001',
      })
        .then(() => {
          expect(importPNR).to.have.callCount(2);
          expect(getTicket).to.have.callCount(1);
          expect(cancelPNR).to.have.callCount(1);
        })
        .catch(console.error);
    });
    it('should fail with AirRuntimeError.PNRHasOpenTickets PNR if tickets have OPEN coupons and no cancelTicket option', () => {
      // Spies
      const importPNR = sinon.spy(() => Promise.resolve([{
        tickets: [{
          number: '1234567890123',
        }, {
          number: '1234567890456',
        }],
      }]));
      const cancelPNR = sinon.spy(() => Promise.resolve(true));
      const getTicket = sinon.spy(options =>
        Promise.resolve({
          1234567890123: {
            tickets: [{
              coupons: [{
                status: 'V',
              }, {
                status: 'V',
              }],
            }],
          },
          1234567890456: {
            tickets: [{
              coupons: [{
                status: 'O',
              }, {
                status: 'O',
              }],
            }],
          },
        }[options.ticketNumber])
      );

      // Services
      const airService = () => ({
        importPNR,
        getTicket,
        cancelPNR,
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      return createAirService().cancelPNR({
        pnr: 'PNR001',
      })
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.FailedToCancelPnr);
          expect(err.causedBy).to.be.an.instanceof(AirRuntimeError.PNRHasOpenTickets);
          expect(importPNR).to.have.callCount(1);
          expect(getTicket).to.have.callCount(2);
          expect(cancelPNR).to.have.callCount(0);
        });
    });
    it('should fail with AirRuntimeError.PNRHasOpenTickets PNR if tickets have coupons other than OPEN', () => {
      // Spies
      const importPNR = sinon.spy(() => Promise.resolve([{
        tickets: [{
          number: '1234567890123',
        }, {
          number: '1234567890456',
        }],
      }]));
      const cancelPNR = sinon.spy(() => Promise.resolve(true));
      const getTicket = sinon.spy(options =>
        Promise.resolve({
          1234567890123: {
            tickets: [{
              coupons: [{
                status: 'V',
              }, {
                status: 'V',
              }],
            }],
          },
          1234567890456: {
            tickets: [{
              coupons: [{
                status: 'F',
              }, {
                status: 'A',
              }],
            }],
          },
        }[options.ticketNumber])
      );

      // Services
      const airService = () => ({
        importPNR,
        getTicket,
        cancelPNR,
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      return createAirService().cancelPNR({
        pnr: 'PNR001',
        cancelTickets: true,
      })
        .catch((err) => {
          expect(err).to.be.an.instanceof(AirRuntimeError.FailedToCancelPnr);
          expect(err.causedBy).to.be.an.instanceof(
            AirRuntimeError.UnableToCancelTicketStatusNotOpen
          );
          expect(importPNR).to.have.callCount(1);
          expect(getTicket).to.have.callCount(2);
          expect(cancelPNR).to.have.callCount(0);
        });
    });
    it('should cancel tickets and PNR if no errors occured', () => {
      // Spies
      const importPNR = sinon.spy(() => Promise.resolve([{
        tickets: [{
          number: '1234567890123',
        }, {
          number: '1234567890456',
        }],
      }]));
      const cancelTicket = sinon.spy(() => Promise.resolve(true));
      const cancelPNR = sinon.spy(() => Promise.resolve(true));
      const getTicket = sinon.spy(options =>
        Promise.resolve({
          1234567890123: {
            tickets: [{
              coupons: [{
                status: 'V',
              }, {
                status: 'V',
              }],
            }],
          },
          1234567890456: {
            tickets: [{
              coupons: [{
                status: 'O',
              }, {
                status: 'O',
              }],
            }],
          },
        }[options.ticketNumber])
      );

      // Services
      const airService = () => ({
        importPNR,
        getTicket,
        cancelPNR,
        cancelTicket,
      });
      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      return createAirService().cancelPNR({
        pnr: 'PNR001',
        cancelTickets: true,
      })
        .then((result) => {
          expect(result).to.equal(true);
          expect(importPNR).to.have.callCount(2);
          expect(getTicket).to.have.callCount(2);
          expect(cancelTicket).to.have.callCount(1);
          expect(cancelPNR).to.have.callCount(1);
        });
    });
  });

  describe('getExchangeInformation', () => {
    it('should check functions to be called', () => {
      const d = moment();
      const importPNR = sinon.spy(
        () => Promise.resolve([{ createdAt: d }])
      );

      const exchange = sinon.spy(({ bookingDate }) => {
        expect(bookingDate).to.be.equal(d.format('YYYY-MM-DD'));
      });

      const airService = () => ({
        exchangeQuote: exchange,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      const service = createAirService();
      service.importPNR = importPNR;

      return service.getExchangeInformation({
        pnr: 'PNR001',
      }).then(() => {
        expect(importPNR).to.have.callCount(1)
        expect(exchange).to.have.callCount(1);
      });
    });
  });

  describe('exchangeBooking', () => {
    it('should check functions to be called', () => {
      const importPNR = sinon.spy(
        () => Promise.resolve([{
          pnr: 111,
          uapi_reservation_locator: 123,
        }])
      );

      const exchange = sinon.spy(({ exchangeToken, uapi_reservation_locator  }) => {
        expect(exchangeToken).to.be.equal('token');
        expect(uapi_reservation_locator).to.be.equal(123);
      });

      const airService = () => ({
        exchangeBooking: exchange,
      });

      const createAirService = proxyquire('../../src/Services/Air/Air', {
        './AirService': airService,
      });

      const service = createAirService();
      service.importPNR = importPNR;

      return service.exchangeBooking({
        exchangeToken: 'token',
      }).then(() => {
        expect(importPNR).to.have.callCount(1);
        expect(exchange).to.have.callCount(1);
      });
    });
  });
});
