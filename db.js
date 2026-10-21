const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
);

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  reset_token: { type: DataTypes.STRING },
  reset_token_expiry: { type: DataTypes.DATE }
});

const Person = sequelize.define('Person', {
  name: { type: DataTypes.STRING, allowNull: false },
  unique_id: { type: DataTypes.STRING },
  relationship: { type: DataTypes.STRING },
  context: { type: DataTypes.STRING },
  priority: { type: DataTypes.STRING }
});

const QualityScore = sequelize.define('QualityScore', {
  person_name: { type: DataTypes.STRING, allowNull: false },
  dimension_key: { type: DataTypes.STRING, allowNull: false },
  score: { type: DataTypes.INTEGER },
  evidence: { type: DataTypes.TEXT },
  last_reviewed: { type: DataTypes.DATEONLY }
});

const RiskScore = sequelize.define('RiskScore', {
  person_name: { type: DataTypes.STRING, allowNull: false },
  dimension_key: { type: DataTypes.STRING, allowNull: false },
  severity: { type: DataTypes.INTEGER },
  confidence: { type: DataTypes.INTEGER },
  evidence: { type: DataTypes.TEXT },
  last_reviewed: { type: DataTypes.DATEONLY }
});

const Observation = sequelize.define('Observation', {
  person_name: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY },
  type: { type: DataTypes.STRING },
  context: { type: DataTypes.STRING },
  what: { type: DataTypes.TEXT },
  impact: { type: DataTypes.INTEGER },
  action: { type: DataTypes.STRING }
});

const MonthlyHistory = sequelize.define('MonthlyHistory', {
  person_name: { type: DataTypes.STRING, allowNull: false },
  month_year: { type: DataTypes.STRING, allowNull: false },
  trust_score: { type: DataTypes.INTEGER },
  risk_score: { type: DataTypes.INTEGER }
});

// Relationships
User.hasMany(Person, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Person.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(QualityScore, { foreignKey: 'user_id', onDelete: 'CASCADE' });
QualityScore.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(RiskScore, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RiskScore.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Observation, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Observation.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(MonthlyHistory, { foreignKey: 'user_id', onDelete: 'CASCADE' });
MonthlyHistory.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Person,
  QualityScore,
  RiskScore,
  Observation,
  MonthlyHistory
};