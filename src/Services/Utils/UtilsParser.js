import errors from './UtilsErrors';

function currencyConvertParse(json) {
  try {
    json = json['util:CurrencyConversion'].map(curr => ({
      from: curr.From,
      to: curr.To,
      rate: curr.BankSellingRate,
    }));
  } catch (e) {
    throw new errors.UtilsParsingError(json);
  }

  return json;
}

const errorHandler = (err) => {
  let errno = 0;
  try {
    errno = err.detail[`common_${this.uapi_version}:ErrorInfo`][`common_${this.uapi_version}:Code`];
  } catch (e) {
    console.log('cant parse error');
  }

  switch (errno * 1) {
    default:
      throw new errors.UtilsRuntimeError(err);
  }
};

module.exports = {
  UTILS_ERROR: errorHandler,
  CURRENCY_CONVERSION: currencyConvertParse,
};
