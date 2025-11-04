module.exports = {
  async up(queryInterface, Sequelize) {
    // Xóa constraint cũ (nếu có)
    await queryInterface.removeConstraint('services', 'services_project_id_fkey').catch(() => {});

    // Thêm constraint mới có CASCADE
    await queryInterface.addConstraint('services', {
      fields: ['project_id'],
      type: 'foreign key',
      name: 'services_project_id_fkey',
      references: {
        table: 'projects',
        field: 'id'
      },
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Nếu rollback, thêm constraint lại mà không có CASCADE
    await queryInterface.removeConstraint('services', 'services_project_id_fkey');
    await queryInterface.addConstraint('services', {
      fields: ['project_id'],
      type: 'foreign key',
      name: 'services_project_id_fkey',
      references: {
        table: 'projects',
        field: 'id'
      },
      onDelete: 'NO ACTION'
    });
  }
};
