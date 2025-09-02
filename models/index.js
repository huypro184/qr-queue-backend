const User = require('./User');
const Project = require('./Project');
const Service = require('./Service');
const Line = require('./Line');
const Ticket = require('./Ticket');

User.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});
Project.hasMany(User, { 
  foreignKey: 'project_id', 
  as: 'users',
  onDelete: 'SET NULL'
});

Project.hasMany(Service, { 
  foreignKey: 'project_id', 
  as: 'services',
  onDelete: 'CASCADE'
});
Service.belongsTo(Project, { 
  foreignKey: 'project_id', 
  as: 'project' 
});

Service.hasMany(Line, { 
  foreignKey: 'service_id', 
  as: 'lines',
  onDelete: 'CASCADE'
});
Line.belongsTo(Service, { 
  foreignKey: 'service_id', 
  as: 'service' 
});

Line.hasMany(Ticket, { 
  foreignKey: 'line_id', 
  as: 'tickets',
  onDelete: 'CASCADE'
});
Ticket.belongsTo(Line, { 
  foreignKey: 'line_id', 
  as: 'line' 
});

User.hasMany(Ticket, { 
  foreignKey: 'user_id', 
  as: 'tickets',
  onDelete: 'CASCADE'
});
Ticket.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

module.exports = {
  User,
  Project,
  Service,
  Line,
  Ticket
};