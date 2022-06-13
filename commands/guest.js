const { roles } = require('../config.json');
const {	SlashCommandBuilder } = require('@discordjs/builders');


module.exports = {
	data: new SlashCommandBuilder()
		.setDescription('Gives guest access')
		.setDefaultPermission(false)
		.addUserOption(option =>
			option.setName('member').setDescription('Mention a user to assign').setRequired(true))
		.addStringOption(option =>
			option.setName('branch')
			.setDescription('The branch to assign to')
			.setRequired(false)
			.addChoices(
                        {name:'Sovereign', value:'sm'},
                        {name:'Voracious', value:'vm'},
                        {name:'Opulent', value:'om'},
                        {name:'Enlightened', value:'em'},
                        {name:'Ascended', value:'am'}
        				)),


	async execute(interaction) {
		const memberObj = interaction.options.getMember('member');
		const branch = interaction.options.getString('branch');

		const rolesToAdd = new Array(roles.guest, roles.access);
        // if they're already been registered
		if (!memberObj._roles.includes(roles.unassigned)) {
			interaction.reply({content: 'Cannot set user to guest', ephemeral: true });
			return false;
		} else {
            // add relevant guest roles and add guest name
			rolesToAdd.forEach(role => { memberObj.roles.add(role)});
			memberObj.setNickname(branch ? memberObj.user.username + ' P.' + String(branch).toUpperCase() : memberObj.user.username);
			interaction.reply({
				content: branch ? 'Done! Member successfully set to guest pending entry for ' + String(branch).toUpperCase() + '.' : 'Done! Member successfully set to guest', ephemeral: true
			});
		}
	},
};