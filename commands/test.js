const { SlashCommandBuilder } = require('@discordjs/builders');
const {Discord} = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setDescription('Checks Stuff')
		.setDefaultPermission(false),
	async execute(interaction) {
        // puts off replying to interaction
        await interaction.deferReply();
        
        let finalEmbed = new Discord.MessageEmbed().setColor('RED').setTitle('Members who don\'t meet the raid requirement');
        console.log('Fetching all members\' names');
        await interaction.editReply({embeds:[finalEmbed]})
    },
};