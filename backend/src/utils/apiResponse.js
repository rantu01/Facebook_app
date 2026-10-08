function ok(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, message = 'Request failed', code = 'ERROR', status = 400, details = null) {
  return res.status(status).json({ success: false, message, code, details });
}

module.exports = { ok, fail };
