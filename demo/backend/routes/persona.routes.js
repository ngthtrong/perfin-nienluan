const express = require('express');
const PersonaModel = require('../models/persona.model');
const UserTraitModel = require('../models/userTrait.model');

const router = express.Router();
const userId = 'default_user';

router.get('/profile', async (req, res) => {
  res.json({ success: true, data: await UserTraitModel.getProfile(userId) });
});

router.put('/profile/consent', async (req, res) => {
  const consent = await UserTraitModel.setConsent(userId, req.body.consent === true);
  res.json({ success: true, data: { consent } });
});

router.put('/profile/traits/:type', async (req, res) => {
  const data = await UserTraitModel.upsert(userId, req.params.type, req.body.value);
  res.json({ success: true, data });
});

router.delete('/profile/traits/:type', async (req, res) => {
  res.json({ success: true, data: await UserTraitModel.remove(userId, req.params.type) });
});

// List available AI personalities (REQ-09).
router.get('/', async (req, res) => {
  const [personas, active] = await Promise.all([PersonaModel.list(), PersonaModel.getActive(userId)]);
  res.json({ success: true, data: personas, active });
});

// Set the active persona for the current user.
router.post('/active', async (req, res) => {
  const personaId = Number(req.body.persona_id || req.body.id);
  if (!personaId) return res.status(400).json({ success: false, error: 'Thiếu persona_id' });
  const persona = await PersonaModel.setActive(personaId, userId);
  res.json({ success: true, data: persona });
});

module.exports = router;
