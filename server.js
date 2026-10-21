require('dotenv').config();


const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { sequelize, User, Person, QualityScore, RiskScore, Observation, MonthlyHistory } = require('./db');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Sync Database
sequelize.sync({ alter: true }).then(() => console.log('Database synced')).catch(console.error);

// ---------------------------------------------------------
// AUTH MIDDLEWARE
// ---------------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access Denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid Token' });
    req.user = user;
    next();
  });
}

// ---------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password_hash });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashToken = await bcrypt.hash(resetToken, 10);

    user.reset_token = hashToken;
    user.reset_token_expiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { 
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      }
    });

    const resetLink = `http://localhost:${PORT}/reset-password.html?token=${resetToken}&email=${email}`;
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Trust Dashboard" <noreply@trustdashboard.local>',
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click here: ${resetLink}`
    });

    res.json({ message: 'Password reset link sent to email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !user.reset_token || user.reset_token_expiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const isValid = await bcrypt.compare(token, user.reset_token);
    if (!isValid) return res.status(400).json({ error: 'Invalid or expired token' });

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// PROTECTED DATA ROUTES
// ---------------------------------------------------------

app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const people = await Person.findAll({ where: { user_id: userId } });
    const quality = await QualityScore.findAll({ where: { user_id: userId } });
    const risk = await RiskScore.findAll({ where: { user_id: userId } });
    const observations = await Observation.findAll({ where: { user_id: userId } });
    const history = await MonthlyHistory.findAll({ where: { user_id: userId } });

    res.json({ people, quality, risk, observations, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/people', authenticateToken, async (req, res) => {
  try {
    const { name, relationship, context, priority, unique_id } = req.body;

    if (!unique_id || !/^\d{1,4}$/.test(unique_id)) {
      return res.status(400).json({ error: 'Unique ID must be up to 4 digits and contain only numbers.' });
    }
    
    const existing = await Person.findOne({ where: { user_id: req.user.id, unique_id } });
    if (existing) {
      return res.status(400).json({ error: 'This ID already exists. Please select a different one.' });
    }

    const person = await Person.create({ user_id: req.user.id, name, relationship, context, priority, unique_id });
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/people/:id', authenticateToken, async (req, res) => {
  try {
    const person = await Person.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!person) return res.status(404).json({ error: 'Not found' });
    
    // Also delete associated scores and observations for this person
    await QualityScore.destroy({ where: { user_id: req.user.id, person_name: person.name } });
    await RiskScore.destroy({ where: { user_id: req.user.id, person_name: person.name } });
    await Observation.destroy({ where: { user_id: req.user.id, person_name: person.name } });
    await MonthlyHistory.destroy({ where: { user_id: req.user.id, person_name: person.name } });
    
    await person.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quality', authenticateToken, async (req, res) => {
  try {
    const { person_name, dimension_key, score, evidence } = req.body;
    const last_reviewed = new Date().toISOString().slice(0, 10);
    
    let record = await QualityScore.findOne({ where: { user_id: req.user.id, person_name, dimension_key } });
    if (record) {
      record.score = score !== '' ? score : null;
      record.evidence = evidence;
      record.last_reviewed = last_reviewed;
      await record.save();
    } else {
      record = await QualityScore.create({
        user_id: req.user.id, person_name, dimension_key, 
        score: score !== '' ? score : null, evidence, last_reviewed
      });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/risk', authenticateToken, async (req, res) => {
  try {
    const { person_name, dimension_key, severity, confidence, evidence } = req.body;
    const last_reviewed = new Date().toISOString().slice(0, 10);
    
    let record = await RiskScore.findOne({ where: { user_id: req.user.id, person_name, dimension_key } });
    if (record) {
      record.severity = severity !== '' ? severity : null;
      record.confidence = confidence !== '' ? confidence : null;
      record.evidence = evidence;
      record.last_reviewed = last_reviewed;
      await record.save();
    } else {
      record = await RiskScore.create({
        user_id: req.user.id, person_name, dimension_key, 
        severity: severity !== '' ? severity : null, 
        confidence: confidence !== '' ? confidence : null, 
        evidence, last_reviewed
      });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/observations', authenticateToken, async (req, res) => {
  try {
    const { date, person_name, type, context, what, impact, action } = req.body;
    const obs = await Observation.create({
      user_id: req.user.id, person_name, date, type, context, what, impact, action
    });
    res.json(obs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/observations/:id', authenticateToken, async (req, res) => {
  try {
    const obs = await Observation.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!obs) return res.status(404).json({ error: 'Not found' });
    await obs.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/history', authenticateToken, async (req, res) => {
  try {
    const { person_name, month_year, trust_score, risk_score } = req.body;
    let record = await MonthlyHistory.findOne({ where: { user_id: req.user.id, person_name, month_year } });
    if (record) {
      record.trust_score = trust_score;
      record.risk_score = risk_score;
      await record.save();
    } else {
      record = await MonthlyHistory.create({
        user_id: req.user.id, person_name, month_year, trust_score, risk_score
      });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
