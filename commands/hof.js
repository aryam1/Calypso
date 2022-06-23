const { SlashCommandBuilder } = require('@discordjs/builders');
const api = require('../api.js');
const { roles } = require('../config.json');
const Discord = require('discord.js');
const db = require('../db.js');
const fuzzysort = require('fuzzysort')
const utils = require('../utils.js')
const checkall = require('./check.js')

// object to store all current and past categories
const activities={'0': 'VOG Full',  '1': 'VOG Full Trio',  '2': 'VOG Full Duo',  '3': 'VoG Boss Duo', '4': 'VoG Boss Solo',  '5': 'DSC Full', 
                  '6': 'DSC Full Trio',  '7': 'DSC Full Duo', '8': 'DSC Boss Duo',  '9': 'DSC Boss Solo',  '10': 'GOS Full', '11': 'GOS Full Trio',
                  '12': 'GOS Boss Duo',  '13': 'LW Full', '14': 'LW Full Trio',  '15': 'LW Boss Duo',  '16': 'LW Boss Solo',
                  '17': 'ST Solo Flawless',  '18': 'POH Solo Flawless',  '19': 'Prophecy Solo Flawless',  '20': 'Solo GM',
                  '21': 'Zoned Control Point Disparity', '22': 'Zoneless Control Point Disparity', '23': 'Rumble Win Streak',  '24': 'Comp Win Streak',
                  '25': 'Flawless Pool Trials Win Streak',  '26': 'Legend', '27': '10 Seasonal Flawless Cards',  '28': 'Top 500', '29':'Most Control Kills',
                  '30':'Fastest Control Stack Game', '31':'Fastest Rumble Game', '32':'K/D From 10 Consecutive Control Games',
                  '33':'K/D From 10 Consecutive Trials Games', '34':'K/D From 10 Consecutive Comp Games','35':'K/D From 10 Consecutive Rumble Games',
                  '36':'GOA Solo Flawless','37':'VOTD Full','38':'VOTD Full Trio', '39':'Most Invasion Kills', '40':'Gambit Winstreak',
                  '41':'Duality Solo Flawless'}
// current categories in hof
const currentActivities={'0': 'VOG Full',  '1': 'VOG Full Trio',  '2': 'VOG Full Duo',
                         '5': 'DSC Full', '6': 'DSC Full Trio',  '7': 'DSC Full Duo', 
                         '10': 'GOS Full', '11': 'GOS Full Trio', '12': 'GOS Boss Duo',
                         '13': 'LW Full', '14': 'LW Full Trio',
                         '17': 'ST Solo Flawless',  '18': 'POH Solo Flawless',  '19': 'Prophecy Solo Flawless',  '20': 'Solo GM',
                         '21': 'Zoned Control Point Disparity', '22': 'Zoneless Control Point Disparity',
                         '23': 'Rumble Win Streak',  '24': 'Comp Win Streak', '25': 'Flawless Pool Trials Win Streak',  
                         '26': 'Legend', '27': '10 Seasonal Flawless Cards',  '28': 'Top 500', '29':'Most Control Kills',
                         '30':'Fastest Control Stack Game', '31':'Fastest Rumble Game', 
                         '32':'K/D From 10 Consecutive Control Games', '33':'K/D From 10 Consecutive Trials Games', 
                         '34':'K/D From 10 Consecutive Comp Games','35':'K/D From 10 Consecutive Rumble Games',
                         '36':'GOA Solo Flawless','37':'VOTD Full','38':'VOTD Full Trio', '39':'Most Invasion Kills', '40':'Gambit Winstreak',
                         '41':'Duality Solo Flawless'}

// lists of pvp categories, activities that are time based and activities that award every record 
const pvpActivities = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 39, 40];
const notTimedActivities = [21,22,23,24,25,26,27,28,29,32,33,34,35,39,40];
const soloStars = [1, 2, 6, 7, 11, 12, 14, 17, 18, 19, 20, 26, 27, 28, 36, 38,41];

// drop down menu of raid options 
const raidsRow = new Discord.MessageActionRow().addComponents(
    new Discord.MessageSelectMenu().setCustomId('hof-raids').setPlaceholder('Raid Records Filter').setMinValues(2).setMaxValues(3)
    .addOptions([
        {label: 'VOTD',description: 'Select VoTD Runs',value: 'votd'},
        {label: 'VOG',description: 'Select VoG Runs',value: 'vog'},
        {label: 'DSC',description: 'Select DSC Runs',value: 'dsc'},
        {label: 'GOS',description: 'Select GoS Runs',value: 'gos'},
        {label: 'LW',description: 'Select LW Runs',value: 'lw'},
        {label: 'Full',description: 'Select Full Runs',value: 'full'},
        {label: 'Boss',description: 'Select Boss CP Runs',value: 'boss'},
        {label: 'Trio',description: 'Select Trio Runs',value: 'trio'},
        {label: 'Duo',description: 'Select Duo Runs',value: 'duo'},
        {label: 'Solo',description: 'Select Solo Runs',value: 'solo'},
    ]),
);
// drop down menu of other pve options
const pveRow = new Discord.MessageActionRow().addComponents(
    new Discord.MessageSelectMenu().setCustomId('hof-pve').setPlaceholder('Other PvE Records Filter')
    .addOptions([
        {label: 'None',description: 'Deselect',value: 'none'},
        {label: 'Duality Solo Flawless',description: 'Select Duality Runs',value: 'duality'},
        {label: 'Grasp Of Avarice Solo Flawless',description: 'Select Grasp of Avarice Runs',value: 'goa'},
        {label: 'Prophecy Solo Flawless',description: 'Select Prophecy Runs',value: 'prophecy'},
        {label: 'Pit Of Heresy Solo Flawless',description: 'Select Pit of Heresy Runs',value: 'poh'},
        {label: 'Shattered Throne Solo Flawless',description: 'Select Shattered Throne Runs',value: 'st solo'},
        {label: 'Solo Grandmaster',description: 'Select Solo Grandmaster Runs',value: 'gm'},
    ]),
);
// drop down menu of pvp and gambit options
const pvpRow = new Discord.MessageActionRow().addComponents(
    new Discord.MessageSelectMenu().setCustomId('hof-pvp').setPlaceholder('PvP Records Filter')
    .addOptions([
        {label: 'None',description: 'Deselect',value: 'none'},
        {label: 'Zoned Control Point Disparity',description: 'Select Zoned Control Stomps',value: 'zoned'},
        {label: 'Zoneless Control Point Disparity',description: 'Select Zoneless Control Stomps',value: 'zoneless'},
        {label: 'Rumble Win Streak',description: 'Select Rumble Streaks',value: 'rumble win'},
        {label: 'Comp Win Streak',description: 'Select Comp Streaks',value: 'comp win'},
        {label: 'Trials Win Streak',description: 'Select Trials Streaks',value: 'trials win'},
        {label: 'Seasonal Legend',description: 'Select Seasonal Legend Players',value: 'legend'},
        {label: '10 Trials Flawless Cards',description: 'Select Flawless Farmers',value: 'flawless cards'},
        {label: 'Top 500',description: 'Select Top 500 Gamers',value: 'top'},
        {label: 'Most Control Kills',description: 'Select Control Slayers',value: 'control kills'},
        {label: 'Fastest Control Stack Game',description: 'Select Speedy Control Stackers',value: 'control stack'},
        {label: 'Fastest Rumble Game',description: 'Select Speedy Rumble Farmers',value: 'rumble game'},
        {label: 'K/D From 10 Consecutive Control Games',description: 'Select Control K/D Farmers',value: 'control games'},
        {label: 'K/D From 10 Consecutive Trials Games',description: 'Select Trials K/D Farmers',value: 'trials games'},
        {label: 'K/D From 10 Consecutive Comp Games',description: 'Select Comp K/D Farmers',value: 'comp games'},
        {label: 'K/D From 10 Consecutive Rumble Games',description: 'Select Rumble K/D Farmers',value: 'rumble games'},
        {label: 'Most Invasion Kills',description: 'Select EoT Users',value: 'invasion kills'},
        {label: 'Gambit Winstreak',description: 'Select Mote Sluts',value: 'gambit winstreak'},
    ]),
);

module.exports = {
	data: new SlashCommandBuilder()
    .setDefaultPermission(false)
	.setDescription('Adds record to the Hall of Fame')
    .addSubcommand((subcommand)=>
                    subcommand.setName('add')
                    .setDescription('Add a record to the Hall of Fame this season')
                    .addIntegerOption(option=>option.setName('activity').setRequired(true)
                                      .setDescription(`Enter an activity code (0-${(Object.keys(activities).length-1)})`))
                    .addStringOption(option=>option.setName('url').setDescription('URL for proof').setRequired(true))
                    .addNumberOption(option=>option.setName('value').setDescription('Minutes taken/ Score Value').setRequired(true))
                    .addUserOption(option=>option.setName('member_1').setDescription('Member 1').setRequired(true))
                   	.addStringOption(option=>option.setName('description').setDescription('Record Description'))
                    .addIntegerOption(option=>option.setName('secs').setDescription('Seconds taken'))
                    .addUserOption(option=>option.setName('member_2').setDescription('Member 2'))
                    .addUserOption(option=>option.setName('member_3').setDescription('Member 3'))
                    .addUserOption(option=>option.setName('member_4').setDescription('Member 4'))
                    .addUserOption(option=>option.setName('member_5').setDescription('Member 5'))
                    .addUserOption(option=>option.setName('member_6').setDescription('Member 6'))
                  )
    .addSubcommand((subcommand)=>subcommand.setName('setup').setDescription('Refreshes the Hall of Fame Channel'))
    .addSubcommand((subcommand)=>subcommand.setName('delete').setDescription('Delete a Record from the Hall of Fame')
                   .addIntegerOption(option=>option.setName('id').setDescription('ID of Record to Delete').setRequired(true)))
    .addSubcommand((subcommand)=>subcommand.setName('check').setDescription('Checks the Records from the Hall of Fame')),
    
    async execute(interaction,check=false) {
        // doesn't defer if the function was called by another command
		check || await interaction.deferReply();
        if (interaction.options?.getSubcommand() == 'add'){
            let choice = interaction.options.getInteger('activity');
            const url =  interaction.options.getString('url');
            let secs = interaction.options.getInteger('secs');
            let value = interaction.options.getNumber('value');
            let desc =  interaction.options.getString('description');
            let time;
            
            // if the user enters a number for a non existent category, return an error
            if (activities[choice]==undefined){interaction.editReply("Sorry that's not a valid activity");return}
            // if the category is time based then converts the value to hh:mm:ss time
            if (!notTimedActivities.includes(choice)) time = `${ Math.floor(value/60) }:${ ('00'+value%60).substr(-2) }:${ secs?secs:'00' }`;
            const members = new Array;
            // fetches all supplied members 
            for(let i=1; i<7; i++){
                let mem =interaction.options.getUser(`member_${i}`);
                if (mem){members.push(`<@${mem.id}>`)}
            };
            // gets current season number
            let season= await api.getSeason();
            // if category gives stars to everyone
            if (soloStars.includes(choice)) {
                // demand description if one isn't supplied and category needs description
                if (desc==undefined && [20,27,28].includes(choice)) {interaction.editReply("Sorry a description is required");return}
                // fetch all descriptions of records in that cateory this season
                let descs = Object.values(await db.hofDescFetch(season,choice));
                // find any descriptions similar to the one supplied
                let match = fuzzysort.go(desc,descs);
                // if it's similar to an existing description use existing, otherwise create new description 
                desc = (match[0]?.target != undefined) ? match[0].target : desc;
            }
            // sets up the embed to check the inputted information
            const embeddedMessage = new Discord.MessageEmbed()
            .setColor('BLUE')
            .setTitle("Record to be added")
            .setDescription(`**${activities[choice]}**`)
            .addFields({
                name:'Users',
                value:`${members.join(',')}`
            }, {
                name:`**URL**`,
                value: url
            }, {
                name:`**Season**`,
                value: season.toString()
            }, {
                name:`**Description**`,
                value: (desc ?? 'None')
            }, {
                name:`**${time?'Time':'Value'}**`,
                value:`${(time??value)}`
            });
            // adds buttons to embed and sends it
            const checkRow = new Discord.MessageActionRow();
            checkRow.addComponents(new Discord.MessageButton().setStyle('PRIMARY').setCustomId('hof-yes').setEmoji('832609687609540678'));
            checkRow.addComponents(new Discord.MessageButton().setStyle('DANGER').setCustomId('delete').setEmoji('781215176745287701'));
            interaction.editReply({embeds : [embeddedMessage], components : [checkRow]})
        }
        else if (interaction.options?.getSubcommand() == 'check' || check ){
            // resets record field
            await db.recordsReset()
            // gets current season number
            let currentSeason = await api.getSeason();
            for (let activity of Object.keys(activities)){
            	// fetch all records of the category in this season
                let current = await db.hofFetch(currentSeason,activity);
                // skip loop if there's no records
                if (!current.length) continue
                if (soloStars.includes(parseInt(activity))) {
                    if (pvpActivities.includes(parseInt(activity))){
                        // gives all members of non ranked pvp records a star
                        for (const rec of current){
                        	const members = await Object.values(rec).slice(-6).filter(x=>x);
                        	await utils.changeStars(1,members,interaction)
                    	}
                    }
                    else {
                        let memberSets = {};
                        // constructs object of descriptions and members with records with such descriptions
                        for (const rec of current){
                            const members = await Object.values(rec).slice(-6).filter(x=>x);
                            memberSets[rec.Description] ? memberSets[rec.Description].push(...members) : memberSets[rec.Description]= members;
                        }
                        let finalMembers=new Array;
                        // contructs array of members from unique members in each description then gives them all stars
                        for (let i of Object.values(memberSets)){ finalMembers.push(...new Set(i)) }
                        await utils.changeStars(1,finalMembers,interaction)
                    }
                }
                else {
                    // gets all members of top record in category and gives them all star
                    const members = await Object.values(current[0]).slice(-6).filter(x=>x);
                    await utils.changeStars(1,members,interaction)
                }
            }
            // checks everyone's names
            await checkall.execute(interaction,true)
            // replies to interaction if function was called through interaction
            check || interaction.editReply("Records Reset and Checked"); 
        }
        else if (interaction.options.getSubcommand() == 'setup'){
            let pveString=' ';
            let pvpString=' ';
            // formats all the current categories into strings based on wether they're pve or pvp categories
            for await (const [index,act] of Object.entries(currentActivities)) {
                let  string = (soloStars.includes(parseInt(index)))? (`**__${index}. ${act}__** \r\n`) : (`${index}. ${act} \r\n`);
                (pvpActivities.includes(parseInt(index)))? pvpString += string : pveString += string;
            };
            let channel = await interaction.guild.channels.fetch('905629151212474408');
            // sets up embed with all the details, attaches the select menu and sends it 
            let hofEmbed = new Discord.MessageEmbed()
            .setColor('PURPLE')
            .setTitle("═══●∘◦◦∘● ✮⭒Hall of Fame⭒✮ ●∘◦◦∘●═══")
            .setDescription("This channel showcases certain records that our members have achieved every season. You can submit your record for a category in <#860337283286302750> for the current but keep in mind that all submissions must be in a squad of full clanmates. \r\n\nUsing the drop down menus below, you can take a look at the Hall of Fame records for whichever season and category you want. \r\n\nThe following list outlines the current accepted categories for Hall of Fame:")
            .addFields({
                name: 'PvE Categories',
                value: pveString,
                inline:true
            }, {
                name: 'PvP Categories',
                value: pvpString,
                inline:true
            }, {
                name: 'Important Notes',
                value:"◦ The categories underlined and in bold award ✮ progress just for completions whilst the other categories only award ✮ progress to the top entry\n\n◦ All members in the Hall of Fame have a ✮ next to their name. Every 5 entries into the Hall of Fame will grant you another star to your name, and if you manage to impressively hit 13 entries into Hall of Fame, we'll turn that unlucky number lucky by allowing you a custom color with the role \"Hall of Fame Legend\" for the rest of the season (no staff colors)\n\n◦ Any ridiculously easy cheeses will not be accepted",
            });
            const seasonRow = new Discord.MessageActionRow().addComponents(new Discord.MessageSelectMenu().setCustomId('hof-season').setPlaceholder('Season Filter')
                .addOptions([
                	{label: 'None',description: 'Deselect',value: 'none'},
                    {label: 'Season 15',description: 'Get records for Season 15 (Lost)',value: '15', emoji: {name:'maramoan',id:'893065009704362025'}},
                	{label: 'Season 16',description: 'Get records for Season 16 (Risen)',value: '16', emoji: {id: '978699239452450886',name: 'salad'}},
                	{label: 'Season 17',description: 'Get records for Season 17 (Haunted)',value: '17', emoji: {id: '945681562484236359',name: 'calyes'}},
                ]),
            );
            interaction.channel.send({embeds : [hofEmbed], components: [seasonRow]});
            interaction.deleteReply();
        }
        // if command is to delete
        else {
            let id = interaction.options.getInteger('id');
            // fetches record if exists otherwise errors
            let record = await db.hofFetchOne(id);
            if (!record) {interaction.editReply('Invalid Record ID',true); return}
            // inverts value to normal 
            let value = -record.Value;
            let time;
            // if category is timed then interpret the value in seconds as a time string
            if (!notTimedActivities.includes(record.Activity)) {
                time = `${('00'+Math.floor(record.Value/3600)).substr(-2)}:${('00'+Math.floor(record.Value%3600/60)).substr(-2)}:${record.Value%60}`;
            };
            // put details of fetched record into embed for user to check
            const embeddedMessage = new Discord.MessageEmbed()
            .setColor('BLUE')
            .setTitle("Record to be Deleted")
            .setDescription(`**${activities[record.Activity]} : ${id}**`)
            .addFields({
                name:'Users',
                value: Object.values(record).slice(-6).filter(x=>x).map(x=>`<@${x}>`).join()
            }, {
                name:`**URL**`,
                value: record.URL
            }, {
                name:`**Season**`,
                value: record.Season.toString()
            }, {
                name:`**Description**`,
                value: (record.Description ?? 'None')
            }, {
                name:`**${time?'Time':'Value'}**`,
                value:`${(time??value)}`
            });
            const checkRow = new Discord.MessageActionRow();
            checkRow.addComponents(new Discord.MessageButton().setStyle('PRIMARY').setCustomId('hof-delete-yes').setEmoji('832609687609540678'));
            checkRow.addComponents(new Discord.MessageButton().setStyle('DANGER').setCustomId('delete').setEmoji('781215176745287701'));
            interaction.editReply({embeds : [embeddedMessage], components : [checkRow]})
        }
	},
    async buttonHandle(interaction){
        // if the button is in the dms then delete the message it's attached to
        if (!interaction.guildId) interaction.message.delete()
        // if the user tries to accept an embed they didn't generate, eror is thrown
        else if (interaction.user.id != interaction.message.interaction.user.id) {
            await interaction.reply({content : "You can't use this button",ephemeral:true});
            return false
        }
        // if the button is to accept a record addition
        else if (interaction.customId.split('-')[1] == 'yes') {
            let msg = interaction.message.embeds[0];
            // get category from title in description
         	let activity = Object.keys(activities).find(key => activities[key] === (msg.description.slice(2,-2)));
            // extracts data from relevant fields
            let url = msg.fields[1].value;
            let season = msg.fields[2].value;
            let desc = msg.fields[3].value;
            let value=msg.fields[4];
            // gets member ids into array from mentions 
            let members = msg.fields[0].value.replace(/[<>@]/g,'').split(',');
            // if the category is timed, converts the time string to seconds, otherwise negates the value for sorting purposes
            (value.name =='**Time**')? value = Number(value.value.split(':').reduce((acc,timez) => (60 * acc) + +timez)) : value = -Number(value.value);
            if (desc=='None') desc=null;
            // puts all the data into the correct order for the db
            const insert = [null,season,activity,url,value,desc,members].flat();
            // fills the rest of the array out with nulls if less than 6 members were involved
            let finalInsert = insert.concat(new Array(12-insert.length).fill(null));
            // inserts new record into db then fetches all records in the target category this season
        	let insert_id = await db.hofAdd(finalInsert);
            let current = await db.hofFetch(season,activity);
            // if the category is not ranked or the inserted record is the first in the category
            if (soloStars.includes(parseInt(activity)) || current.length<2) {
                // give stars to members of new record
                await utils.changeStars(1,members,interaction);
            }
            // if the new record is the best in the category now
            else if (current[0].id == insert_id) {
                // remove stars from current record holders and give stars to new record holders
                let current_members = Object.values(current[1]).slice(-6).filter(x=>x)
                await utils.changeStars(0,current_members,interaction);
                await utils.changeStars(1,members,interaction)
            };
            // updates names of members
            members.map(async m=>{
                const member = await interaction.guild.members.fetch(m);
                member.setNickname(await utils.validateName(member));
            })
            await interaction.message.edit({ embeds : [new Discord.MessageEmbed().setColor('GREEN').setTitle('Record Added')], components: [] });
            setTimeout(() => interaction.message.delete(),1000);
        }
        // if button is to delete a current record
        else if (interaction.customId.split('-')[1] == 'delete') { 
            // extract record id from embed then delete record
            let id = parseInt(interaction.message.embeds[0].description.split(':')[1].slice(1,-2));
            db.hofDelete(id);
            await interaction.message.edit({ embeds : [new Discord.MessageEmbed().setColor('GREEN').setTitle(`Record ${id} Deleted`)], components: [] });
            setTimeout(() => interaction.message.delete(),1000);
            // checks all hof members
            this.execute(interaction,true);
            }
    },
    async selectHandle(interaction){
        await interaction.deferUpdate()
        // if no menu items are selected don't do anything
        if (interaction.values == 'none') return null
        // if the menu is the season filter, reply with menus to select categories for that season
        if (interaction.customId == 'hof-season'){
            interaction.followUp({ embeds :[new Discord.MessageEmbed().setColor('PURPLE').setTitle(`═●∘◦◦∘● ✮⭒Records for Season ${interaction.values[0]}⭒✮ ●∘◦◦∘●═`)], components:[raidsRow,pveRow,pvpRow] , ephemeral: true})
        }
        else{
            // shallow copy of all activities
            let filteredResults =[...Object.values(activities)];
            // reduces the total list of categories by fuzzy matching against each selected value
            for (let choice of interaction.values){
                let res = fuzzysort.go(choice,filteredResults,{threshold:-100})
                filteredResults = res.reduce((total,curr)=>[...total,curr.target],[]);
            }
            // if no categories remain after fuzzy matching all values, error
            if (filteredResults.length == 0){
                interaction.user.send('You have chosen an invalid selection for the HoF records, a full list of current categories can be found in the main message in <#885891115868389426>');
            }
            else {
                // extracts season from embed
                let season = (parseInt(interaction.message.embeds[0].title.slice(29,31)));
                // finds key of category
                let activityCode = Object.keys(activities).find(key => activities[key] === filteredResults[0]);
                console.log(`User ${interaction.user.username} Season: ${season}, Activity:${activities[activityCode]} with code: ${activityCode}`)
                let results;
                // fetches all records for category this season and reverses if Top 500 because reverse ordering (lower is better) 
                if (activityCode=='28') { results = (await db.hofFetch(season,activityCode)).reverse()}
                // sorts by description and value
                else if (soloStars.includes(parseInt(activityCode))) { results = await db.hofFetch(season,activityCode,true) }
                else { results = await db.hofFetch(season,activityCode) }
                // sets up results embed
                const embed = new Discord.MessageEmbed().setColor('PURPLE').setTitle(`Season ${season} Leaderboard for ${activities[activityCode]}`).setTimestamp()
                .setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});
                let resultText=''
                // formats all results
                for (let i=0; i < results.length; i++){
                    // removes id and season from record
                    let record = Object.values(results[i]).slice(2); 
                    // converts value to normal and parses it as time if category is timed
                    let time = -record[2];
                    if (!notTimedActivities.includes(results[i].Activity)) {
                        time = `${('00'+Math.floor(record[2]/3600)).substr(-2)}:${('00'+Math.floor(record[2]%3600/60)).substr(-2)}:${record[2]%60}`;
                    };
                    // sets description field as link if no description exists
                    let desc = (record[3]==null)? 'Link' : record[3];
                    let userNames = '';
                    // iterates through the member ids and fetches their name and appends to name string
                    for (let j = 4; j < 10;j++){
                        if (record[j]){
                            // catches cases where member is no longer in server
                            try { userNames=userNames.concat((await interaction.guild.members.fetch(record[j])).nickname.replace(/[☠⚔✮♧♤φ♡♢§]/g,''),', ') }
                            catch{ continue }
                        }
                    }
                    // formats all parts of record into 1 string with masked hyperlink and collates with other record strings
                    resultText = resultText.concat(`${i+1}. ${time} - [${desc}](${record[1]})\n ${userNames.slice(0, -2)}\n`)
                }
                (resultText.length<2)? resultText = 'No Records Found':{}
                embed.setDescription(resultText);
                // sends embed with records and delete button, errors if dms are disabled
                const dRow = new Discord.MessageActionRow().addComponents(new Discord.MessageButton().setStyle('DANGER').setCustomId('delete').setLabel('Delete'));
                interaction.user.send({embeds :[embed], components : [dRow]}).catch(err=>{interaction.followUp({ephemeral:true,content:'Enable "Allow direct messages from server members" under your Privacy and Safety settings to get the records'})})
            }
        };
    },
    // command to fetch records for a user
    async records(interaction){
        await interaction.deferReply({ephemeral:true});
        let target = await interaction.options.getUser('target');
        // assigns target to interaction creater if no target is specified
        target ??= interaction.member.user;
        let {id,username} = target; 
        // fetches total number of records for user this season
        let total = await db.recordsGet(id);
        // gets season
        let season = await api.getSeason()
        // gets all records by user this season
        let results = await db.hofFetchAll(season,id);
        // sets up results embed
        const embed = new Discord.MessageEmbed().setColor('PURPLE').setTitle(`${total} S${season} Records for ${username}`).setTimestamp()
        .setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});
        let resultText=''
        for (let i=0; i < results.length; i++){
            // fetches all records for category of current record this season
            let category =  await db.hofFetch(season,results[i].Activity);
            // gets information of current record
            let record = Object.values(results[i]).slice(2);
            // gets name of category
            let entry = activities[record[0]];
            // inverts value
            let time = -record[2];
            // parses value as time string if timed category
            if (!notTimedActivities.includes(results[i].Activity)) {
                time = `${('00'+Math.floor(record[2]/3600)).substr(-2)}:${('00'+Math.floor(record[2]%3600/60)).substr(-2)}:${record[2]%60}`;
            };
            // concatenates description with category name if description exists
            let desc = (record[3]==null)? entry : `${entry}-${record[3]}`;
            let userNames = '';
            // iterates through the member ids and fetches their name and appends to name string
            for (let j = 4; j < 10;j++){
                if (record[j]){
                    try { userNames=userNames.concat((await interaction.guild.members.fetch(record[j])).nickname.replace(/[☠⚔✮♧♤φ♡♢§]/g,''),', ') }
                    catch{ continue }
                }
            }
            let index = i+1;
            // replaces record numbering with db index if branch head fetches records
            if (interaction.member._roles.includes(roles.head)) index = results[i].id;
            // formats record information as string
            let recordText = `${index}. ${time} - [${desc}](${record[1]})`;
            // makes string bold and underlined if record gives star progress
            recordText = (results[i].id===category[0].id || soloStars.includes(parseInt(results[i].Activity))) ? `__**${recordText}**__\n` :`${recordText}\n`
            resultText = resultText.concat(recordText)
        }
        (resultText.length<2)? resultText = 'No Records Found':{}
        embed.setDescription(resultText);
        interaction.editReply({embeds :[embed], ephemeral:true})
    },
};