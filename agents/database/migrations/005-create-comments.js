"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("comments", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      songId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'songs', key: 'id' },
        onDelete: 'CASCADE',
      },
      collaborationId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'collaborations', key: 'id' },
        onDelete: 'CASCADE',
      },
      parentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'comments', key: 'id' },
        onDelete: 'SET NULL',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("comments");
  },
}; 