const {	SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const { roles } = require('../config.json');
const hof = require('./hof.js');


module.exports = {
	data: new SlashCommandBuilder().setDescription('Get HoF Records').setDefaultPermission(false)
    .addUserOption(option => option.setName('target').setDescription('User to get Records for').setRequired(false)),
    // sends the interaction to another command file to handle
	async execute(interaction) {hof.records(interaction)},
};