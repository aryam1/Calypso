const { SlashCommandBuilder } = require('@discordjs/builders');
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
        let noRaids = [];
        let noClan = [];
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
            const mem = sovMembers[i];            
            const memName = (mem.destinyUserInfo.bungieGlobalDisplayName? mem.destinyUserInfo.bungieGlobalDisplayName:mem.destinyUserInfo.displayName).substr(0,30);
            let chars = Object.keys(await api.getCharacters(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId));
            if (chars.length == 0) continue
            let totalRaids = chars.map(async char=>{
                let raids = await api.getRaids(mem.destinyUserInfo.membershipType,mem.destinyUserInfo.membershipId,char);
                return (raids == null) ? [] : (raids?.filter(raid=>new Date(raid.period) > (new Date()-1209600000)))?.map(raid=>raid.activityDetails.instanceId); 
            });
            totalRaids = (await Promise.all(totalRaids)).flat()
            if (totalRaids.length<2){
                noRaids.push(memName);
                continue;
            }
            Promise.all(totalRaids.map(async raid=>{
                let names = (await api.getActivityReport(raid))?.reduce((total,current)=>{
                    if (current.player.destinyUserInfo.membershipType==0) return total
                    let name = (current.player.destinyUserInfo.bungieGlobalDisplayName ? current.player.destinyUserInfo.bungieGlobalDisplayName :
                                current.player.destinyUserInfo.displayName).substr(0,30);
                    return (allNames.includes(name)) ? [...total,name] : total;
                },[]);
                return (names?.length>1) ? true:false;
            })).then(values=> {if (values.filter(Boolean).length<2) noClan.push(memName)});
        };
        console.log(noRaids.length +" Members haven't raided in the past 2 weeks")
        
        noClan = noClan.reduce((total,current)=>`${total}\n${current},`,'')
        noRaids = noRaids.reduce((total,current)=>`${total}\n${current},`,'')
        
        finalEmbed.addField('2 Raids Not Done with Clan Members in Past 2 Weeks',noClan,true)
        finalEmbed.addField('2 Raids Not Done in Past 2 Weeks',noRaids,true)
        await interaction.editReply({embeds:[finalEmbed]})
    },
};