const Joi = require('joi');

const scriptSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  hook: Joi.string().min(3).max(500).required(),
  script: Joi.string().min(20).max(5000).required(),
  cta: Joi.string().max(300).allow(''),
  visualScenes: Joi.array().items(Joi.string().max(500)).max(12).default([]),
  keywords: Joi.array().items(Joi.string().max(60)).max(8).default([]),
  hashtags: Joi.array().items(Joi.string().max(60)).max(8).default([]),
  thumbnailText: Joi.string().max(80).allow(''),
  caption: Joi.string().min(5).max(2200).required(),
  videoPrompt: Joi.string().max(2000).allow(''),
  seoReasoning: Joi.string().max(2000).allow(''),
});

const seoSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  caption: Joi.string().min(5).max(2200).required(),
  keywords: Joi.array().items(Joi.string().max(60)).max(10).default([]),
  hashtags: Joi.array().items(Joi.string().max(60)).max(10).default([]),
  cta: Joi.string().max(300).allow(''),
  description: Joi.string().max(2000).allow(''),
  seoScore: Joi.number().min(0).max(100).default(0),
  qualityScore: Joi.number().min(0).max(100).default(0),
  reasoning: Joi.string().max(2000).allow(''),
});

const analysisSchema = Joi.object({
  relevance: Joi.number().min(0).max(100).required(),
  viralPotential: Joi.number().min(0).max(100).required(),
  freshness: Joi.number().min(0).max(100).required(),
  audienceInterest: Joi.number().min(0).max(100).required(),
  competition: Joi.number().min(0).max(100).required(),
  facebookSuitability: Joi.number().min(0).max(100).required(),
  videoSuitability: Joi.number().min(0).max(100).required(),
  recommendation: Joi.string().valid('SKIP', 'CONSIDER', 'RECOMMENDED', 'TOP_PICK').required(),
  reason: Joi.string().max(1000).allow(''),
});

function validateOrThrow(schema, obj) {
  const { error, value } = schema.validate(obj, { abortEarly: false, stripUnknown: true });
  if (error) {
    const err = new Error(`AI output validation failed: ${error.details.map((d) => d.message).join('; ')}`);
    err.code = 'AI_VALIDATION_ERROR';
    err.status = 502;
    err.details = error.details.map((d) => d.message);
    throw err;
  }
  return value;
}

module.exports = { scriptSchema, seoSchema, analysisSchema, validateOrThrow };
