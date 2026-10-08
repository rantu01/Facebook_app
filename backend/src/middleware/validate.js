const { fail } = require('../utils/apiResponse');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      return fail(res, 'Validation failed', 'VALIDATION_ERROR', 422, error.details.map((d) => d.message));
    }
    req[source] = value;
    return next();
  };
}

module.exports = { validate };
