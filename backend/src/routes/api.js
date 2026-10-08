const express = require('express');
const { authRequired, adminOnly } = require('../middleware/auth');
const auth = require('../controllers/authController');
const { dashboard } = require('../controllers/dashboardController');
const trends = require('../controllers/trendsController');
const content = require('../controllers/contentController');
const lib = require('../controllers/libraryController');
const fb = require('../controllers/facebookController');
const { automation, settings, jobs, usage, music } = require('../controllers/adminControllers');
const test = require('../controllers/testController');
const story = require('../controllers/storyController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// storage for music uploads
const musicDir = path.resolve(__dirname, '..', '..', '..', 'storage', 'music');
fs.mkdirSync(musicDir, { recursive: true });
const upload = multer({ dest: musicDir, limits: { fileSize: 50 * 1024 * 1024 } });
// memory uploads for Test Lab (photo/video publish tests)
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// Auth (public login, rest protected)
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authRequired, auth.me);

router.use(authRequired);

router.get('/dashboard', dashboard);

router.get('/trends', trends.list);
router.post('/trends/research', trends.research);
router.post('/trends/analyse', trends.analyse);

router.get('/content', content.list);
router.post('/content', content.create);
router.get('/content/:id', content.getOne);
router.patch('/content/:id', content.update);
router.delete('/content/:id', content.remove);
router.post('/content/:id/script', content.genScript);
router.post('/content/:id/video', content.genVideo);
router.post('/content/:id/voice', content.genVoice);
router.post('/content/:id/subtitles', content.genSubtitles);
router.post('/content/:id/process', content.process);
router.post('/content/:id/seo', content.genSeo);
router.post('/content/:id/quality', content.quality);
router.post('/content/:id/schedule', content.schedule);
router.post('/content/:id/publish', content.publishNow);

router.get('/videos', lib.listVideos);
router.get('/schedule', lib.listScheduled);
router.patch('/schedule/:id', lib.updateScheduled);
router.get('/published', lib.listPublished);

router.get('/facebook', fb.status);
router.post('/facebook/connect', fb.connect);
router.post('/facebook/:id/disconnect', fb.disconnect);
router.post('/facebook/:id/refresh', fb.refresh);
// OAuth callback is public (Meta redirects without JWT) — mounted separately in app.js

router.get('/automation', automation.get);
router.patch('/automation', automation.update);
router.post('/automation/run', automation.runNow);

router.get('/settings/ai', settings.getAI);
router.patch('/settings/ai', settings.updateAI);
router.get('/settings/seo', settings.getSEO);
router.patch('/settings/seo', settings.updateSEO);
router.get('/settings/content', settings.getContent);
router.patch('/settings/content', settings.updateContent);
router.get('/settings/system', settings.getSystem);
router.patch('/settings/system', settings.updateSystem);

router.get('/jobs', jobs.list);
router.post('/jobs/:id/retry', jobs.retry);

router.get('/usage', usage.summary);
router.get('/usage/list', usage.list);

router.get('/music', music.list);
router.post('/music', upload.single('file'), music.create);

// Test Lab — real integration checks (protected, admin console only)
router.get('/test/status', test.status);
router.get('/test/gemini-models', test.geminiModels);
router.post('/test/script', test.testScript);
router.post('/test/photo', memUpload.single('file'), test.testPhoto);
router.post('/test/video', memUpload.single('file'), test.testVideo);
router.post('/test/video-submit', test.testVideoSubmit);
router.get('/test/video-status', test.testVideoStatus);
router.post('/test/slideshow', test.testSlideshow);
router.post('/test/hf-video', test.testHFVideo);
router.get('/test/hf-video-models', test.hfVideoModels);

// Story Autopilot — Gemini text posts / video queue with on-off + mode switch
router.get('/story/settings', story.getSettings);
router.patch('/story/settings', story.updateSettings);
router.get('/story/history', story.history);
router.post('/story/post-story-now', story.postStory);
router.post('/story/post-video-now', story.postVideo);

module.exports = router;
