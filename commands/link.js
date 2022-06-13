const { SlashCommandBuilder } = require('@discordjs/builders');
const { branchData, roles } = require('../config.json');
const db = require('../db.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setDescription('Gets ingame links for users').setDefaultPermission(false)
    .addStringOption(option => 
                     option.setName('site')
                     .setDescription('Choose what link you want to return')
                     .setRequired(true)
                     .addChoices(
                                 {name:'Raid Report',value: 'rr'},
                                 {name:'Strike Report',value: 'sr'},
                                 {name:'Destiny Tracker',value: 'dtr'},
                                 {name:'Trials Report',value: 'tr'},
                                 {name:'Crucible Report',value: 'cr'}
    							))
    .addMentionableOption(option => option.setName('member').setDescription('Choose member you want to get link for (default is you)')),
    
    async execute(interaction) {
        function getURL(member) {
            switch (type) { 
                case 'rr': return `<https://raid.report/${['xb','ps','pc'][parseInt(member[0])-1]}/${member[1]}>`;
                case 'sr': return `<https://strike.report/${['xb','ps','pc'][parseInt(member[0])-1]}/${member[1]}>`;
                case 'dtr': return `<https://destinytracker.com/destiny-2/profile/${['xbl','psn','steam'][parseInt(member[0])-1]}/${member[1]}/overview>`;
                case 'tr': return `<https://trials.report/report/${member[0]}/${member[1]}>`;
                case 'cr': return `<https://crucible.report/report/${member[0]}/${member[1]}>`;
            }
        }
        // puts off replying to interaction
		await interaction.deferReply()
        const type = await interaction.options.getString('site')
        const mention = interaction.options.getMentionable('member');
        let user = interaction.member.user.id;
        let mass = false;
        
        // if a target is specified, the id is set and the boolean mass is set to true if the target is a role and not a person
        if (mention){ user = mention.id, mass = mention.constructor.name =='Role' }
        // if target isn't a role, fetch info for interaction sender and return their desired URL
        if (!mass) {db.fetchMember(user).then(x=>{interaction.editReply(getURL(x))}).catch(x=>{interaction.editReply("User isn't registered with me")})} 
        
        else{
            // if the interaction sender isn't a branch head they can't fetch links for a role
            if (!interaction.member._roles.includes(roles.head)){ interaction.editReply(`You don't have the permissions to fetch links for a role`); return false };
            let ids;
            // gets list of members with that role and transforms it into a list of ids
           	await interaction.guild.roles.fetch(user).then(x=>ids=x.members.map(m=>m.user.id))
            
            // fetches the db data for all those ids
            let members = await db.fetchMassMembers(ids)
            const reportText = new Array;
            // if there are members with the role
            await members?.map(async (x,i)=> {
                let mem = await interaction.guild.members.fetch(x.Discord);
                // pushes data fow user to total data array in groups of 20 per array index
                const arrIndex = Math.floor(i/20);
                if (reportText[arrIndex] === undefined) reportText[arrIndex] = '';
                reportText[arrIndex] = reportText[arrIndex] + `**${mem.nickname}** - [Link](${getURL(x.UserInfo.split("/"))})\n`
            })
            await interaction.editReply(`Found reports for ${members? members.length: 0} members.`);
            // sends an embed for each 20 rows of links in the array
            reportText.forEach((page, index) => {
                const embed = new Discord.MessageEmbed().setColor('#E67E22').setTitle(`**Reports** (${index + 1}/${reportText.length})`).setDescription(page)
                .setTimestamp().setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});
                interaction.followUp({ embeds: [embed] });
            });
        }
    },
};