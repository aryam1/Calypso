const utils = require('../utils');
const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const Discord = require('discord.js');
const api = require('../api.js');
const {roles,branchData} = require('../config.json');

module.exports = {
	data: new SlashCommandBuilder().setDescription('Checks Stuff').setDefaultPermission(false),
	async execute(interaction) {
        // puts off replying to interaction
        await interaction.deferReply();        
        let finalEmbed = new Discord.MessageEmbed().setColor('RED').setTitle('Members who don\'t meet the raid requirement');
        const allNames = [];
        let sovMembers = [];
        const noRaids = [];
        const noClanMembers =[];
        console.log('Fetching all members\' names');
        for (let i in branchData){
            const clanMembers = await api.getClanMembers(branchData[i].groupId);
            if (i == 'sm') sovMembers = clanMembers;
            await clanMembers.map(mem=>{
                allNames.push((mem.destinyUserInfo.bungieGlobalDisplayName?mem.destinyUserInfo.bungieGlobalDisplayName:mem.destinyUserInfo.displayName).substr(0,30));
            });
        }
        sovMembers.forEach(async mem=>{
            let chars = Object.keys(await api.getCharacters(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId));
            if (chars.length == 0) return
            let totalRaids = new Array();
            await chars.map(async char=>{
                let raids = await api.getRaids(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId,char);
                raids = await (raids?.filter(raid=>new Date(raid.period) > (new Date()-1209600000)))?.map(raid=>raid.activityDetails.instanceId);
                if(raids == undefined) return
                totalRaids = totalRaids.concat([...raids]);
            });
            console.log(totalRaids)
        })
        await interaction.editReply({embeds:[finalEmbed]})
    },
};