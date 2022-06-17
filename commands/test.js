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
        const noClan = [];
        console.log('Fetching all members\' names');
        for (let i in branchData){
            const clanMembers = await api.getClanMembers(branchData[i].groupId);
            if (i == 'sm') sovMembers = clanMembers;
            await clanMembers.map(mem=>{
                allNames.push((mem.destinyUserInfo.bungieGlobalDisplayName ?mem.destinyUserInfo.bungieGlobalDisplayName :
                               mem.destinyUserInfo.displayName).substr(0,30));
            });
        }
        for (let i = 0; i<sovMembers.length; i++){
            let mem = sovMembers[i];
            let chars = Object.keys(await api.getCharacters(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId));
            if (chars.length == 0) continue
            let totalRaids = chars.map(async char=>{
                let raids = await api.getRaids(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId,char);
                return (raids == null) ? [] : (raids?.filter(raid=>new Date(raid.period) > (new Date()-1209600000)))?.map(raid=>raid.activityDetails.instanceId); 
            });
            totalRaids = (await Promise.allSettled(totalRaids)).reduce((total,current)=>{return total.concat([...current.value])},[]);
            if (totalRaids.length<3){
                noRaids.push((mem.destinyUserInfo.bungieGlobalDisplayName ?mem.destinyUserInfo.bungieGlobalDisplayName :
                               mem.destinyUserInfo.displayName).substr(0,30));
                continue;
            }
            let clanRuns = 0;
            let withClan = totalRaids.map(async raid=>{
                let names = (await api.getActivityReport(raid))?.reduce((total,current)=>{
                    if (current.player.destinyUserInfo.membershipType==0) return total
                    let name = (current.player.destinyUserInfo.bungieGlobalDisplayName ? current.player.destinyUserInfo.bungieGlobalDisplayName :
                                current.player.destinyUserInfo.displayName).substr(0,30);
                    return (allNames.includes(name)) ? [...total,name] : total;
                },[]);
                if (names?.length>1) clanRuns +=1;
            });
            if (clanRuns<3){
                noClan.push((mem.destinyUserInfo.bungieGlobalDisplayName ?mem.destinyUserInfo.bungieGlobalDisplayName :
                               mem.destinyUserInfo.displayName).substr(0,30));
            };
        };
        noClan = noClan.reduce((total,current)=>`${total}\n${current},`,'')
        noRaids = noRaids.reduce((total,current)=>`${total}\n${current},`,'')
        
        finalEmbed.addField('Under 3 Raids Done with Clan Members in Past 2 Weeks',noClan,true)
        finalEmbed.addField('Under 3 Raids Done in Past 2 Weeks',noRaids,true)
        await interaction.editReply({embeds:[finalEmbed]})
    },
};