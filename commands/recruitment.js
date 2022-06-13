const {	SlashCommandBuilder } = require('@discordjs/builders');
const { roles,branchData } = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder().setDescription('Returns recruitment links').setDefaultPermission(false)
		.addStringOption(option =>
			option.setName('branch')
			.setDescription('Returns branch application link')
			.setRequired(false)
			.addChoices(
            			{name:'Sovereign', value:'sm'},
                        {name:'Voracious', value:'vm'},
                        {name:'Opulent', value:'om'},
                        {name:'Enlightened', value:'em'},
                        {name:'Ascended', value:'am'}
        				)),
	async execute(interaction) {
		const branch = interaction.options.getString('branch');
        // replies with a branch URL if branch is specified otherwise returns general recruitment message
		const reply = branch ? `<https://www.bungie.net/en/ClanV2?groupid=${branchData[branch].groupId}>` : 
`Destiny 2 Branches:
:small_blue_diamond:[Sovereign Madness - PvE Endgame Branch | (Read requirements)](<https://www.bungie.net/en/ClanV2?groupid=3993665>)
:small_blue_diamond:[Voracious Madness - PvP Branch | (Read requirements)](<https://www.bungie.net/en/ClanV2?groupid=4164697>)
-
:small_blue_diamond:[Ascended Madness - General Gameplay Branch | (No requirement)](<https://www.bungie.net/en/ClanV2?groupid=4263239>)
:small_blue_diamond:[Opulent Madness - General Gameplay Branch | (No requirement)](<https://www.bungie.net/en/ClanV2?groupid=3678940>)
:small_blue_diamond:[Enlightened Madness - General Gameplay Branch | (No requirement)](<https://www.bungie.net/en/ClanV2?groupid=4225691>)

All branches run all content with each other. We have branches because we're a big clan and we group people with similar interests in the same branch.`;
		interaction.reply(reply);
	},
};