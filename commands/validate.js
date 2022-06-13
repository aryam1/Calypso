const utils = require('../utils');
const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const Discord = require('discord.js');
const api = require('../api.js');
const {roles,branchData} = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setDescription('Validates Users Are in Clan and Discord')
		.setDefaultPermission(false),
	async execute(interaction) {
        // puts off replying to interaction
        await interaction.deferReply();
        // fetches all member info from db
        const [discIds,userIds] = await db.getRegistered();
        
        let finalEmbed = new Discord.MessageEmbed().setColor('RED').setTitle('Members that need to be kicked from the Clan or the Discord');
        console.log('Fetching valid members');
        // regex of names to ignore 
        let ignoreRe = /(mory)/;
        for (var i in branchData){
            // add header for branch name in bold
            finalEmbed.addField('⠀',`**${branchData[i].name}**`);
            // gets bungie information for members in the branch
            const clanMember = await api.getClanMembers(branchData[i].groupId);
            if(clanMember==null) {interaction.editReply("Bungie API is currently down");return null}
            let clanNames = new Array();
            let discNames = new Array();
            // fetches members with branch role in Discord and generates list of their names without symbols
            let branch = await interaction.guild.roles.fetch(branchData[i].roleId);
            branch.members.forEach(mem=>clanNames.push(utils.validateName(mem,false)));
            clanNames = await Promise.all(clanNames);
            // formats name from bungie profile 
            await clanMember.map(mem=>{
                let name = (mem.destinyUserInfo.bungieGlobalDisplayName ? mem.destinyUserInfo.bungieGlobalDisplayName : mem.destinyUserInfo.displayName).substr(0,30);
                // if name doesn't match ignore regex it gets pushed to an array 
                if (!ignoreRe.test(name)) discNames.push(name);
            })
        	let clanSet = new Set(clanNames);
            let discSet = new Set(discNames);
            // tranforms sets of discord names and bungie names to find names that are in one but not the other
            let discKick = [...clanSet].filter(x => !discSet.has(x)).join('\n');
            let clanKick = [...discSet].filter(x => !clanSet.has(x)).join('\n');
            // sends embed with fields outlining who needs to be kicked from where if they're not in the clan and discord
            if (discKick) finalEmbed.addField('Kick From Discord',discKick,true);
            if (clanKick) finalEmbed.addField('Kick From Clan',clanKick,true);
            if (!clanKick && ! discKick) finalEmbed[`fields`].pop();
        };
        await interaction.editReply({embeds:[finalEmbed]})
    },
};