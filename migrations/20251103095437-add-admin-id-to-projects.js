module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Xóa constraint admin_id nếu đã tồn tại
    try {
      await queryInterface.removeConstraint('projects', 'projects_admin_id_fkey');
    } catch (err) {
      // Nếu không tồn tại thì bỏ qua lỗi
    }

    // 2. Thêm constraint cho admin_id
    await queryInterface.addConstraint('projects', {
      fields: ['admin_id'],
      type: 'foreign key',
      name: 'projects_admin_id_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // 3. Sửa constraint cho services.project_id để thêm ON DELETE CASCADE
    try {
      await queryInterface.removeConstraint('services', 'services_project_id_fkey');
    } catch (err) {}
    await queryInterface.addConstraint('services', {
      fields: ['project_id'],
      type: 'foreign key',
      name: 'services_project_id_fkey',
      references: {
        table: 'projects',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Xóa constraint admin_id
    await queryInterface.removeConstraint('projects', 'projects_admin_id_fkey');

    // 2. Khôi phục constraint services.project_id về mặc định (NO ACTION)
    await queryInterface.removeConstraint('services', 'services_project_id_fkey');
    await queryInterface.addConstraint('services', {
      fields: ['project_id'],
      type: 'foreign key',
      name: 'services_project_id_fkey',
      references: {
        table: 'projects',
        field: 'id'
      },
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });
  }
};