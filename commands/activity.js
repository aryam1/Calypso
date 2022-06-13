const api = require('../api.js');
const { roles, branchData, activity } = require('../config.json');
const {	SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const Discord = require('discord.js');
//raids = /Platform/Destiny2/3/Account/4611686018494903931/Character/{characterId}/Stats/Activities/?page=0&count=100&mode=4
//chars = /Platform/Destiny2/3/Profile/4611686018494903931/?components=200
module.exports = {
	data: new SlashCommandBuilder()
		.setDescription('Activity check command')
		.setDefaultPermission(false)
		.addStringOption(option =>
			option.setName('branch')
			.setDescription('The branch to check activity for')
			.setRequired(true)
            .addChoices( {name:'Sovereign', value:roles.sovereign},
                         {name:'Voracious', value: roles.voracious},
                         {name:'Opulent', value: roles.opulent},
                         {name:'Enlightened', value: roles.enlightened},
                         {name:'Ascended', value: roles.ascended}
                       )),
    
	async execute(interaction) {
        // puts off replying to interaction
		await interaction.deferReply()
        const inactiveLength = activity;
		const branch = interaction.options.getString('branch');
		const leaves = [];
		const inactiveMemberProfiles = [];

		// Get initial list of members and name of branch
        let branchObj = await interaction.guild.roles.fetch(branch);
        let bname = branchObj.name.match(/⋅(.+)⋅/)[1];
        console.log('Attempting fetch of clan members for '+bname)
        // reduces list of members to their ids and fetched db info for those ids
        let ids=branchObj.members.map(m=>m.user.id);
        let dbData = await db.fetchMassMembers(ids)
        
        // Get date information
		const currentDate = new Date();
		const inactiveDate = new Date();
		inactiveDate.setDate(currentDate.getDate() - inactiveLength);
        
        console.log('Creating profile information promises');
        // formats db data for each member and fetches their bungie info
        const promises = dbData.map(async (x,i)=> {
            let member = {};
            [member.membershipType,member.membershipId]=x.UserInfo.split('/');
            return api.getProfile(member.membershipType,member.membershipId);
        });
        let finalEmbed = new Discord.MessageEmbed().setColor('RED').setTimestamp();
        try {
			console.log('Fetching and analysing profiles for ' + promises.length + ' players');
			// Complete all profile fetches
			const result = await Promise.allSettled(promises);
			const failures = result.filter((p) => (p.status === 'rejected'));

			if (failures.length > 0) {
				console.log('Unable to find ' + failures.length + ' players\' data');
                finalEmbed.setFooter({text:`Unable to find ${failures.length} players\' data.`});
                interaction.editReply({embeds:[finalEmbed]})
                return null
			}
            await result.forEach((info,pos)=>{
                let member = info.value;
                let memberOut ={};
                const disc = dbData[pos]
                // calculates the days since they were last active ingame and in server
                member.dateLastPlayed = new Date(member.dateLastPlayed);
                memberOut.lastPlayedDiff = Math.ceil(Math.abs(member.dateLastPlayed - currentDate) / (1000 * 60 * 60 * 24));
                memberOut.lastInteractedDiff = Math.ceil(Math.abs(disc.DiscAct - currentDate) / (1000 * 60 * 60 * 24));
                const notActive = (member.dateLastPlayed < inactiveDate || disc.DiscAct < inactiveDate);
                // if they've been over the threshold in either platform their information gets pushed to an inactive list
                if (notActive) {
                    [memberOut.Discord,memberOut.gameAct,memberOut.discAct]= [disc.Discord, member.dateLastPlayed ,disc.DiscAct];
                    interaction.guild.members.fetch(disc.Discord).then(user=>{
                        // if they're on leave push to leave list otherwise push to inactive list
                        (user._roles.includes(roles.leave)) ? leaves.push(memberOut) :inactiveMemberProfiles.push(memberOut);
                    });
                };
            });
		} 
        catch (error) {
			console.log('Failed');
			console.log(error);
		}
        inactiveMemberProfiles.sort(function (a, b) {return b.lastPlayedDiff - a.lastPlayedDiff;});
        
		console.log('Found ' + inactiveMemberProfiles.length + ' inactive players');
		finalEmbed.setTitle(`${inactiveMemberProfiles.length} Inactive ${bname} Members`)
        if (inactiveMemberProfiles.length==0) {
            interaction.editReply({embeds:[finalEmbed]});
            return null;
        }
        // Generate string of inactive players
		let inactiveString = [];
        let discString='';
        let destString='';
        let memberString='';
        // generates string from usernames of members on leave
        let leaveString= leaves.reduce((result,data)=>{ return result+`<@${data.Discord}>,`},"");
		inactiveMemberProfiles.forEach(inactiveMember => {
            // adds text to relevant string based on if they're inactive in game or in server
            if(inactiveMember.lastInteractedDiff>inactiveLength){discString=discString.concat(`<@${inactiveMember.Discord}>: **${inactiveMember.lastInteractedDiff} days**`,'\n')}
            if (inactiveMember.lastPlayedDiff >inactiveLength) {destString=destString.concat(`<@${inactiveMember.Discord}>: **${inactiveMember.lastPlayedDiff} days**`,'\n')}
            // adds mention of user to string
            memberString = memberString.concat(`<@${inactiveMember.Discord}>`,' ,');
        });
		console.log('Finished.');
        // adds all strings to embed if there are members in those categories
        if (discString.length >1){finalEmbed.addField('Discord',discString,true)}
        if (destString.length >1){finalEmbed.addField('Destiny',destString,true)}
        if (leaveString.length >1){finalEmbed.addField('On Leave',leaveString,false)}

        interaction.editReply({content:memberString,embeds:[finalEmbed]})
	},
};