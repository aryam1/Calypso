const {	SlashCommandBuilder } = require('@discordjs/builders');
const api = require('../api.js');
const db = require('../db.js');
const { roles } = require('../config.json');


module.exports = {
	data: new SlashCommandBuilder().setDescription('Get ID').setDefaultPermission(false)
    .addUserOption(option => option
                   .setName('target')
                   .setDescription('User to get ID for')
                   .setRequired(false)),
    
	async execute(interaction) {
        // puts off replying to interaction
        await interaction.deferReply();
        let target = await interaction.options.getUser('target')
        // sets target id to interaction sender if no target is specified
		target  = target ? target.id : interaction.member.user.id;
        // fetches the db and api user info
        db.fetchMember(target).then(function(user){
            api.getProfile(user[0],user[1]).then(prof=>{
                if(prof==null) {interaction.editReply("Bungie API is currently down");return null}
                // formats and pads their join code
                const code = prof.bungieGlobalDisplayNameCode.toString().padStart(4,'0');
                interaction.editReply(`/join ${prof.bungieGlobalDisplayName}#${code}`)
            })
        }).catch(x=>{ interaction.editReply("User isn't registered with me") });
    },
};