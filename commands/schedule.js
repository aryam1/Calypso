const timezones = require('timezone-abbr-offsets')
const { roles } = require('../config.json');
const {	SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const db = require('../db.js');
const schedule_logic = require('../schedule_logic.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setDescription('Raid setup command')
		.setDefaultPermission(false)
    	.addSubcommand(subcommand=>
                       subcommand.setName('add').setDescription('Schedule an upcoming event')
                       .addUserOption(option =>
                                      option.setName('host').setDescription('Select an event or Raid host').setRequired(true))
                       .addIntegerOption(option => option.setName('hour').setDescription('Hour: (24 Hour Clock) ').setRequired(true))
                       .addStringOption(option =>option.setName('event').setDescription('Choose an event to schedule').setRequired(true)
                                        .addChoices(
                                                    {name:'Vow of the Disciple',value: 'Vow of the Disciple'},
                                                    {name:'Vault of Glass',value: 'Vault of Glass'},
                                                    {name:'Deep Stone Crypt',value: 'Deep Stone Crypt'},
                                                    {name:'Garden of Salvation',value: 'Garden of Salvation'},
                                                    {name:'Last Wish',value: 'Last Wish'},
                                                    {name:'Vote Raid',value: 'Any Raid'},
                                                    {name:'Nightfall',value: 'Nightfall'},
                                                    {name:'Grasp of Avarice',value: 'Grasp of Avarice'},
                                                    {name:'Prophecy',value: 'Prophecy'},
                                                    {name:'Pit of Heresy',value: 'Pit of Heresy'},
                                                    {name:'Shattered Throne',value: 'Shattered Throne'},
                                                    {name:'Iron Banner',value: 'Iron Banner'},
                                                    {name:'Comp',value: 'Comp'},
                                                    {name:'Trials',value: 'Trials'},
                                                    {name:'Scrims',value: 'Scrims'},
                                                    {name:'Movie',value: 'Movie/TV Stream'}
            										))
                       .addStringOption(option => option.setName('type').setDescription('Choose the Type of event').setRequired(true)
                                        .addChoices(
                                                    {name:'Experienced',value: 'Experienced'},
                                                    {name:'Teaching',value: 'Teaching'},
                                                    {name:'Trio Teach',value: 'Trio Teach'},
                                                    {name:'Flawless',value: 'Flawless'},
                                                    {name:'Legend',value: 'Legend'},
                                                    {name:'Master',value: 'Master'},
                                                    {name:'Grandmaster',value: 'Grandmaster'},
                                                    {name:'Drunk',value: 'Drunk'},
                                                    {name:'Sober',value: 'Sober'},
                                                    {name:'PvP',value: 'PvP'}
													))
                       .addIntegerOption(option => option.setName('minutes').setDescription('Minutes: (Default 0) ').setRequired(false))
                       .addStringOption(option => option.setName('timezone').setDescription('Timezone: (UTC Default)').setRequired(false))
                       .addIntegerOption(option => option.setName('date').setDescription('Date: (Default Tomorrow) ').setRequired(false))
                       .addIntegerOption(option => option.setName('month').setDescription('Month:').setRequired(false))
                       .addStringOption(option => option.setName('comments').setDescription('Additional Comments').setRequired(false))
                       .addBooleanOption(option=>option.setName('immediate').setDescription('Choose wether to post immediately or add to the database'))
                      )
    .addSubcommand(subcommand=>subcommand.setName('delete').setDescription('Delete an upcoming event')
                   .addIntegerOption(option => option.setName('id').setDescription('ID of event to be deleted').setRequired(true)))
    .addSubcommand(subcommand=>subcommand.setName('calendar').setDescription('View events schdeduled for the next week')
                   .addUserOption(option =>option.setName('host').setDescription('Filter by host'))),

	async execute(interaction) {
        if (interaction.options.getSubcommand() == 'add'){
            // puts off replying to interaction
            await interaction.deferReply();
            const post = interaction.options.getBoolean('immediate');
            const host = interaction.options.getMember('host');
            const event = interaction.options.getString('event');
            const type = interaction.options.getString('type');
            const comments = interaction.options.getString('comments');
            const hr = interaction.options.getInteger('hour');
            let min= interaction.options.getInteger('minutes');
            let tz = interaction.options.getString('timezone');
            let dt = interaction.options.getInteger('date');
            let mth= interaction.options.getInteger('month');
            // if no date or month or minutes are specified, the variables are set to tomorrow, the current month and 0
            dt ??= new Date().getDate()+1;
            mth ??= new Date().getMonth()+1;
            min ??= 0;
            // gets the current year
            const yr = new Date().getFullYear();
            // converts timezone code to offset
            const tshift =tz?(timezones[tz.toUpperCase()] * 60 * 1000):0;
            // formats datetime options into a parseable string
            const tstamp = `${yr}-${mth}-${dt} ${hr}:${min}:00 UTC`;
            // calculates seconds since epoch
            const epoch = (Date.parse(tstamp)-tshift);
            // sets up embed to confirm event options
            const embeddedMessage = new Discord.MessageEmbed().setColor('BLUE').setTitle("Event to be Scheduled").setDescription(`**${event}**`)
                .addFields({ name:'Host', value:`${host}`}, 
                           { name:`**Type**`, value: type}, 
                           { name:`**Time**`, value: `<t:${epoch/1000}:R>`}, 
                           { name:`**Comments**`, value: comments?comments:'temp'});
            // remove empty comments field if there's no comments
            if (!comments) embeddedMessage[`fields`].pop();      
            // if the calculated epoch is invalid then the user is notified 
            if (Number.isNaN(epoch) || epoch<=new Date().getTime()) await interaction.editReply('Not a valid datetime')
            // if command option to send immediately is true
            else if (post){
                // parses event information into embed form
                let message = schedule_logic.eventParse({Host:host.id,Time:epoch,Event:event,Type:type,Comments:comments});
                // sends embed in current channel and deletes command 
                interaction.channel.send(message);
				interaction.deleteReply();
            }
            else {
                // sends confirmation embed to ensure all data is correct before pushing to db
                const checkRow = new Discord.MessageActionRow().addComponents([
                    new Discord.MessageButton().setStyle('PRIMARY').setCustomId('schedule-yes').setEmoji('832609687609540678'),
                    new Discord.MessageButton().setStyle('DANGER').setCustomId('delete').setEmoji('781215176745287701')]);
                interaction.editReply({embeds : [embeddedMessage], components : [checkRow]})
            }
        }
        else if (interaction.options.getSubcommand() == 'calendar'){
            // puts off replying to interaction as an ephemeral
            await interaction.deferReply({ephemeral:true});
            // sets variable for today and next week
            let today = new Date();
            today.setHours(0,0,0,0);
            let week = new Date((new Date).setDate(today.getDate()+7))
            
            // gets all events in the following week
            let events = (await db.scheduleGetPeriod(today,week));
            let target = await interaction.options.getUser('host');
            const embed = new Discord.MessageEmbed().setColor('GREEN').setTitle(`Events Scheduled For The Following Week`).setTimestamp()
            .setFooter({text:'Calypso', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Jan_Styka_-_Kalipso.jpg'});
            
            // if a target was specified, the fetched events are filtered by those hosted by the target
            if (target!=null) events = events.filter(e=>e.Host==target.id);
            let resultText='';
            events.forEach(ev=>{
                // formats details of the event into a readable sentence
                let recordText = `${ev.id}. <t:${(new Date(ev.Time)).getTime()/1000}:R> - ${ev.Event}`;
                // if no target was specified, add the host name onto the sentence too
                recordText = (!target) ? `${recordText}-<@${ev.Host}>\n` : `${recordText}\n`;
                // add sentence to paragraph
            	resultText = resultText.concat(recordText);
            });
            (resultText.length<2)? resultText = 'No Upcoming Events':{};
            // add paragraph to embed and send embed
            embed.setDescription(resultText);
            interaction.editReply({embeds :[embed], ephemeral:true})
        }
        else if (interaction.options.getSubcommand() == 'delete'){
            // puts off replying to interaction
            await interaction.deferReply();
            const id = interaction.options.getInteger('id');
            // fetches event corresponding to id
            let record = await db.scheduleGet(id);
            // if the record doesn't exist or it's hosted by someone other than the command sender, an error is sent
            if (!record) {interaction.editReply('Invalid Event ID',true); return}
            if (record.Host!=interaction.member.user.id && !interaction.member._roles.includes(roles.head)){interaction.editReply('Invalid Permissions',true);return}
            
            // parses event data fetched from the db into embed form
            let embed = schedule_logic.eventParse(record).embeds[0];
            embed.description = embed.title;
            embed.title = 'Event to be Deleted: '+id;
            // removed comments field if no comments exist
            embed.fields.splice((embed.fields[2]?.name=='Additional Comments')? 3:2);
            embed.setColor('BLUE')
            const checkRow = new Discord.MessageActionRow().addComponents([
                new Discord.MessageButton().setStyle('PRIMARY').setCustomId('schedule-delete').setEmoji('832609687609540678'),
                new Discord.MessageButton().setStyle('DANGER').setCustomId('delete').setEmoji('781215176745287701')]);
            interaction.editReply({embeds : [embed], components : [checkRow]})
        }
    },
    
    async buttonHandle(interaction){
        // if the button pusher isn't the person who sent the command, button won't fire
        if (interaction.user.id != interaction.message.interaction?.user.id && interaction.message.interaction) {
            await interaction.followUp({content : "You can't use this button",ephemeral:true});
            return false
        }
        // if the button is to add an event to the db
        else if (interaction.customId.split('-')[1] == 'yes') {
            // extracts event information from embed
            let msg = interaction.message.embeds[0];
            let event = msg.description.slice(2,-2);
            let host = msg.fields[0].value.slice(3,-1);
            let type = msg.fields[1].value;
            let time = new Date(msg.fields[2].value.slice(3,-3) * 1000);
            let comm = msg.fields[3]?.value;
            // organises data into array and inserts into db
         	const insert = [null,host,time,event,type,comm,null];
            await db.scheduleAdd(insert);
            await interaction.message.edit({ embeds : [new Discord.MessageEmbed().setColor('GREEN').setTitle('Event Scheduled')], components: [] });
            setTimeout(() => interaction.message.delete(),1000);
        }
        // if the button is to delete an event
        else if (interaction.customId.split('-')[1] == 'delete') {
            // extracts event id from title
            const id = interaction.message.embeds[0].title.match(/\d+/g);
            // fetches #scheduled-activity 
            let chann = await interaction.guild.channels.fetch('722172438351183872');
            // extracts host and time from embed
            const host = interaction.message.embeds[0].fields[0].value;
            const time = interaction.message.embeds[0].fields[1].value;
            // deletes the message in #schedule-activity if hosted by the same host and at the same time as the event to be deleted
            (await chann.messages.fetch()).filter(msgs=>msgs.embeds[0]?.fields[0]?.value == host && msgs.embeds[0]?.fields[1]?.value == time).map(msg=>msg.delete())
            // removes from db
            db.scheduleDelete(id);
            await interaction.message.edit({ embeds : [new Discord.MessageEmbed().setColor('RED').setTitle('Event Deleted')], components: [] });
            setTimeout(() => interaction.message.delete(),1000);
        }
        // otherwise it's a react button on a post
        else{
            const newEmbd = new Discord.MessageEmbed(interaction.message.embeds[0]); 
            // removes trailing whitespaces and special symbols from name
            const player = await interaction.member.nickname.replace(/(♧|♢|♤|♡|φ|☠|⚔|✮|§|,)+/g,'').trim();
            // extracts button target
            let id = interaction.customId.split('-')[1];
            // default limit for 6 man events
            let limit=5;
            // booleans to signify if the member signs up as a learner/substitute or both
            let learn=id.includes('Learn');
            let sub = id.includes('Sub');
            // list of 3 man events
            const man3 = ['Nightfall','Shattered Throne','Pit of Heresy','Prophecy','Grasp of Avarice','Comp','Trials'];
            // spreads current fields of event embed
            let fields = [...interaction.message.embeds[0].fields]
            // saves time and host fields
            let static = fields.splice(0,2);
            // saves comments field if exists
            if (fields[0]?.name =='Additional Comments') static.push(fields.shift());
            // establishes field name the member should have their react directed to
            let title='';
            if (!learn){
                // removes user limit for events that aren't player limited 
                if (newEmbd.title == 'Movie/TV Stream') {title = 'Attendees', limit = Infinity}
                else if (newEmbd.title == 'Scrims') {title = 'Main Team', limit = Infinity}
                else if (['Iron Banner','Trials','Comp'].includes(newEmbd.title)) {title = 'Main Team'}
                else {
                    title = 'Experienced';
                    // reduces the limit if the event is teaching
                    if (newEmbd.description.includes('Teaching')) {limit = 3}
                }
            }
            // if the event is a trio , learners are limited to 1
            if (newEmbd.description.includes('Trio')) {limit = 1}
            // if member is a learner or it's a 3 man event, limit is set to 2
            if(man3.includes(newEmbd.title) || id == 'Learner') limit = 2;
            // processes the current reaction fields and reaction data to determine new reaction fields 
            fields= await (this.reactionHandle(fields,title,player,learn,sub,limit)).sort((a,b)=>a.name.length-b.name.length)
            interaction.deferUpdate()
            // spreads constant fields and reaction fields and joins them to be the fields of the new embeds
            newEmbd.fields=[...static,...fields];
            // replaces the event embed with new embed with updated field
            await interaction.message.edit({embeds : [newEmbd]});
            }
    },
    
    async selectHandle(interaction){
        // puts off replying to interaction
        interaction.deferUpdate();
        // if no values were selected don't do anything
        if (interaction.values.includes('none')) return null
        // removes trailing whitespaces and special symbols from name
        const player = await interaction.member.nickname.replace(/(♧|♢|♤|♡|φ|☠|⚔|✮|§|,)+/g,'').trim();
        // spreads and copies the current fields
        let fields = [...interaction.message.embeds[0].fields];
        // copies embed
        const newEmbd = new Discord.MessageEmbed(interaction.message.embeds[0]);
        // saves time and host fields
        let static = fields.splice(0,2);
        // saves comments field if exists
        if (fields[0]?.name =='Additional Comments') static.push(fields.shift());
        let ops = interaction.values;
        // booleans to signify if the member signs up as a learner/substitute or both
        let learn = ops.includes('Learn');
        let sub = ops.includes('Sub');
        // cancels if user chooses multiple of the same category 
        ops = ops.filter(x=>!(['Main', 'Sub', 'Exp','Learn'].includes(x)))
        if (ops.length != 1) return null
        // finds which raid the user has selected
        const raids = ['VOTD','VOG','DSC','GOS','LW'];
        let groups = raids.map(a => fields.filter(b => b.name.includes(a)));
        const groupIndex = raids.indexOf(ops[0]);
        // processes the current reaction fields and reaction data to determine new reaction fields 
        groups[groupIndex]=(this.reactionHandle(groups[groupIndex],ops[0],player,learn,sub,learn? 2:5)).sort((a,b)=>a.name.length-b.name.length);
        // spreads constant fields and reaction fields and joins them to be the fields of the new embeds
        newEmbd.fields=[...static,...groups.flat()];
        // replaces the event embed with new embed with updated field
        interaction.message.edit({embeds:[newEmbd], components:interaction.message.components})
    },
    
    reactionHandle(group,activity,player,learn = false, sub= false,limit){
        // sanitizes name for regex insertion
        let playerClean = player.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        // generates field name for the user's selection
        let target = (`${activity}${learn?' Learner':''}${sub?' Substitutes':''}`).trim();
        // sets up regex to identfy user's name following or preceding a comma
        let reg = new RegExp(`(${playerClean}\,?)|(\,${playerClean})`,'g')
        // checks if any fields already contain the user's name
        let exist = group.findIndex(f=>f.value.includes(player));
        if (exist>=0){
            // slices the name out of the list of names
            const currentName = group[exist].name;
            group[exist].value = group[exist].value.replace(reg,'');
            // if the list is then empty, the field is removed
            group[exist].value || group.splice(exist,1)
            // if the user meant to remove their name from the selection, the function ends here
            if (currentName === target) return group
        }
        // finds field that user selected
        let targetIndex = group.findIndex(x => x.name === target)
        // adds field with username as value and returns if field doesnt exist 
        if (targetIndex<0) return group.concat({name: target, value: player})
        // splits string of names into list 
        let targetArray = group[targetIndex].value.split(',');
        // if user selected main team but main team is full, recurse with sub as true
        if (!sub && targetArray.length==limit) return this.reactionHandle(group,activity,player,learn,true,limit)
        // add username to array and remake string
        group[targetIndex].value = targetArray.concat(player).join(',')
        return group
    }
};