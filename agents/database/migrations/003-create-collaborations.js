"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("collaborations", {
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
        allowNull: false,
        references: { model: 'songs', key: 'id' },
        onDelete: 'CASCADE',
      },
      audioUrl: Sequelize.STRING,
      notes: Sequelize.TEXT,
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      parentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'collaborations', key: 'id' },
        onDelete: 'SET NULL',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
    await queryInterface.dropTable("collaborations");
  },
}; 