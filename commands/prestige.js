const { roles} = require('../config.json');
const utils = require('../utils');
const {	SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder().setDescription('Sets Prestige roles').setDefaultPermission(false)
		.addUserOption(option =>option.setName('member').setDescription('Mention a user to assign').setRequired(true))
		.addStringOption(option =>
                         option.setName('role')
                         .setDescription('Prestige role to assign')
						 .setRequired(true)
                         .addChoices(
            						 {name:'Swords',value: roles.swords},
                         			 {name:'Skulls',value: roles.skulls},
    					 			 {name:'Snakes',value: roles.snakes}
        							 )),

	async execute(interaction) {
        // puts off replying to interaction
		await interaction.deferReply();
		const memberObj = interaction.options.getMember('member');
		const prestigeRole = interaction.options.getString('role');
        // if the target is not a bot
        if (!memberObj.user.bot) {
            // checks if User already has the Prestige Role
            if (memberObj._roles.includes(prestigeRole)) {interaction.editReply({content: 'Member already has the Prestige role!', ephemeral: true });return false}
            else {
                // gives them the prestige role and renames them
                memberObj.roles.add(prestigeRole);
                const newName = await utils.validateName(memberObj);
                memberObj.setNickname(newName);
                interaction.editReply({content:`Congratulations, <@${memberObj.user.id}> has recieved the prestige rank!`}).then(message=>{
                    setTimeout(()=>message.delete(),1000)
                })
            };
        }
        else{interaction.editReply({content:"Bots can't recieve prestige", ephemeral: true});}
    },
};