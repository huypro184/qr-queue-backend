module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Thêm trường admin_id vào bảng projects (nếu chưa có)
    await queryInterface.addColumn('projects', 'admin_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Xóa trường admin_id khỏi bảng projects
    await queryInterface.removeColumn('projects', 'admin_id');
  }
};