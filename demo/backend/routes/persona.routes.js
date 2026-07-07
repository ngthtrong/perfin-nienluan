const express = require('express');
const PersonaModel = require('../models/persona.model');

const router = express.Router();
const userId = 'default_user';

// List available AI personalities (REQ-09).
router.get('/', async (req, res, next) => {
  try {
    const [personas, active] = await Promise.all([PersonaModel.list(), PersonaModel.getActive(userId)]);
    res.json({ success: true, data: personas, active });
  } catch (error) {
    next(error);
  }
});

// Set the active persona for the current user.
router.post('/active', async (req, res, next) => {
  try {
    const personaId = Number(req.body.persona_id || req.body.id);
    if (!personaId) return res.status(400).json({ success: false, error: 'Thiếu persona_id' });
    const persona = await PersonaModel.setActive(personaId, userId);
    res.json({ success: true, data: persona });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
