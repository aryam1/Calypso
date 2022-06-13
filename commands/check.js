const utils = require('../utils');
const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const { roles } = require('../config.json');


module.exports = {
	data: new SlashCommandBuilder().setDescription('Checks Registered Users').setDefaultPermission(false),
    
	async execute(interaction,imported=false) {
        let ignoreRoles = ['528293592364482560','326871603122012160','746125381748129802'];
        // destructures the db info into 2 arrays
        const [discIds,userIds] = await db.getRegistered();
        interaction.guild.members.fetch().then(members => {
            members.forEach(async member =>  {
                // if the member doesn't have any of the roles that are to be ignored
                if (!ignoreRoles.some(r=>member._roles.includes(r))) {
                    if (discIds.includes(member.user.id)){
                        // generates what their nickname should be and sets it to that if it isn't already
                        await utils.validateName(member).then(async newName=>{
                            if (newName !== member.displayName){member.setNickname(newName)};
                            // gives member roles 
                            member.roles.add([roles.member,roles.checkmark])
                        });
                    }
                    else{
                        // remove member roles if they're not registered
                        member.roles.remove([roles.member,roles.checkmark])
                    }
                }
            });
        });
        // doesn't reply if the function was called by another command
       imported || await interaction.reply('Users Checked');
    },
	perms: [roles.head],
};