const Discord = require('discord.js');
const db = require('./db.js');
const Client = require('./index.js')


const expButton = new Discord.MessageButton().setStyle('PRIMARY').setCustomId('schedule-Experienced');
const subButton = new Discord.MessageButton().setStyle('PRIMARY').setCustomId('schedule-Sub').setEmoji('<:stoopid:744724504990973993>');
const learnButton = new Discord.MessageButton().setStyle('PRIMARY').setEmoji('<:sancho:902187284638609439>').setCustomId('schedule-Learner');
const learnSubButton = new Discord.MessageButton().setStyle('PRIMARY').setEmoji('<:waitwhat:689200429783187691>').setCustomId('schedule-Learner Sub');

const allData = {      
    'Vow of the Disciple': {color: '#260a0e', emoji: '<a:kick:950448892925841469>'},
    'Vault of Glass': {color: '#D1D1D1', emoji: '<:deadge:910643970663661608>'},
    'Deep Stone Crypt': {color: '#A4B6F5',emoji: '<:exomad:740142500882153502>'},
    'Garden of Salvation': {color: '#3B643B',emoji: '<:swetpeek:792596651247140894>'},
    'Last Wish': {color: '#00736D', emoji: '<:maramoan:893065009704362025>'},
    'Any Raid': {color: '#70CFA6', emoji: '❓'},
    'Nightfall': {color: '#042698', emoji:'<:ZavalaPog:759150242808987660>'},
    'New Dungeon': {color: '#63bad8', emoji: '<:SuperSaiyan:837500139253530655>'},
    'Grasp of Avarice': {color: '#63bad8', emoji: '<:SuperSaiyan:837500139253530655>'},
    'Pit of Heresy': {color: '#b00000', emoji: '<:ChristianMonka:428236333291536387>'},
    'Prophecy': {color: '#b00097', emoji: '<:Carlton:536018885699174430>'},
    'Shattered Throne': {color: '#220031', emoji: '<:oryxlove:756652335995944961>'},
    'Iron Banner': {color: '#142620', emoji: '<:KillerGoose:859893828357718046>'},
    'Comp': {color: '#b43230', emoji: '<a:monkagun:420977934224850954>'},
    'Trials': {color: '#d7c56f', emoji: '<:sadglas:951624646611058698>'},
    'Scrims': {color: '#226e6a ', emoji: '<a:sadcatshoot:888599108678455327>'},
    'Movie/TV Stream': {color: '#DFD600', emoji: '<:realmonka:421101556742750229>'},
};

const typeData = {
    'PvP': "This is a PvP event, there's nothing special\n",
    'Experienced': 'This will be an **Experienced** run. Please have **at least 5 clears** and KWTD.\n',
    'Teaching': 'This will be a **Teaching** run, with a **max of 2 learners**.\n',
    'Trio Teach': 'This will be a **Trio Teaching** run with **1 learner**.\nPlease have at least **10 clears** of the raid.\n',
    'Flawless': 'This will be a **Flawless** run. Please have at least **15** clears.\n',
    'Grandmaster': 'This will be a **Grandmaster** run (**__MUST BE GM LIGHT LEVEL OR HIGHER__**). Bring your A-game.\n',
    'Legend': 'This will be a **Legend** run.\n',
    'Master':'This will be a **Master** run.\n',
    'Sober': 'This will be a **Sober** viewing.  All ages welcome.\n',
    'Drunk': 'This will be a **Drunk** event.  Be 18+ or in America\'s case, 21+.',   
}

module.exports = {
    // handles the updating of scheduled activity
     daily : async function(Guild) {
         // sets new date variable to midnight utc
         let today = new Date();
         //today.setHours(0,0,0,0);
         // gets date 2 days from now
         let dayafter = new Date((new Date).setDate(today.getDate()+2))
         // get events between 2 dates
         let events = (await db.scheduleGetPeriod(today,dayafter))
         // gets #scheduled-activity and messages from there sent by bot
         let chann = await Guild.channels.fetch('722172438351183872');
         let messages = (await chann.messages.fetch()).filter(msg=>msg.author.bot);
         
         //delete all messages in channel
         messages.map(msg=>msg.delete())
         // filters fetched messages by those that are due after 2 hours prior to the current hour and then reconstructs them as embeds 
         let toSend = messages.filter(msg=>(parseInt(msg.embeds[0]?.fields[1]?.value.match(/(\d+)/)) > + (new Date()/1000)-21600)).reduce((total,current)=>[...total,{embeds:current.embeds,components:current.components}],[])
         let mentions = [];
         for (var event of events){
             // parses each event fetched from the db into embed form
             let messageContent = this.eventParse(event);
             // checks if that event has already been posted by comparing host and time
             let exists = toSend.some(old=>{
                 return old.embeds[0].fields[0].value==messageContent.embeds[0].fields[0].value &&
                     old.embeds[0].fields[1].value==messageContent.embeds[0].fields[1].value
             });
             if (exists) continue
             // if it hasn't been posted, add to post queue
             toSend.push(messageContent)
             // stores mention relevant to the event in a set 
             mentions.push(function(){
                 switch(event.Event)
                 {
                     case 'Nightfall' : return '<@&591384385320779783>';
                     case 'Grasp of Avarice': case 'Pit of Heresy': case 'Prophecy': case 'Shattered Throne': return '<@&637046418384617493>';
                     case 'Iron Banner': return '<@&591389851157397504>';
                     case 'Comp': return '<@&726643392972324926>';
					 case 'Trials': return '<@&684855980227428429>';
                     case 'Scrims': return '<@&696039952542203985>';
                     case 'Movie/TV Stream': return '<@&843307925917532171>';
                     default: return '<@&530098202117013515>';
                 }
             }());
             if (event.Type.includes("Trio")) mentions.push("<@&847895596824002590>")
         }
         // sorts send queue by time 
         toSend = toSend.sort((a,b)=>parseInt(b.embeds[0].fields[1].value.match(/(\d+)/)) - parseInt(a.embeds[0].fields[1].value.match(/(\d+)/)));
         // sends all messages and then pings the roles in the set
         toSend.map(m=>chann.send(m))
         if (mentions.length) chann.send([...new Set(mentions)].join(',')+' Your Upcoming Events')
     },
    
    // combines individual data points about an event into an embed
    eventParse : function({Host,Time,Event,Type,Comments=null,id=null}) {
        // gets the event and type data from the dictionary 
        let eventData = allData[Event];
        let typeString = typeData[Type];
        let reactionString='';
        // converts timestamp to discord timestamp
        Time = (new Date(Time)).getTime()/1000;
        // creates first half of embed
        const embedMsg = new Discord.MessageEmbed().setColor(eventData.color).setTitle(Event)
        .addFields({ name: 'Host', value: `<@${Host}>`},
                   { name: 'Time', value: `<t:${Time}:R> at <t:${Time}:t>`}, 
                   { name: 'Additional Comments', value: Comments ??'temp',});
		// removed comments field if no comments are supplied
        if (!Comments) embedMsg[`fields`].pop();
        
        // sets initial buttons for event
        expButton.setEmoji(eventData.emoji);
        eventData.button=[expButton,subButton];
        
        // handles adding/changing buttons and select menus and also sets the flavour text describing the event
        
        // if vote raid, adds a drop down menu
        if (Event == 'Any Raid'){
            let select = new Discord.MessageSelectMenu().setCustomId('schedule-vote').setPlaceholder('Select Options to Vote').addOptions([
                {label: 'Vow of the Disciple',description: 'Vote for VOTD',value: 'VOTD',emoji: '<:elmo:950437214897180673>'},
                {label: 'Vault of Glass',description: 'Vote for VOG',value: 'VOG',emoji: '<:deadge:910643970663661608>'},
                {label: 'Deep Stone Crypt',description: 'Vote for DSC',value: 'DSC',emoji: '<:exomad:740142500882153502>'},
                {label: 'Garden of Salvation',description: 'Vote for GOS',value: 'GOS',emoji: '<:swetpeek:792596651247140894>'},
                {label: 'Last Wish',description: 'Vote for LW',value: 'LW',emoji: '<:maramoan:893065009704362025>'},
                {label: 'Main Team',description: 'Select to be on the Main Team',value: 'Main',emoji: '<:SHEESH:850135355625177098>'},
                {label: 'Substitute Team',description: 'Select to be a Substitute',value: 'Sub',emoji: '<:stoopid:744724504990973993>'},
    ]).setMinValues(2).setMaxValues(2);
            reactionString = `Use the drop down menu below to vote for the raid you'd like and if you want to be on the sub team or main team.\nIf you want to remove your vote, then just select the same option again`;
            // if teaching run adds teaching options to drop down menu
			if (Type === 'Teaching') {
                select.addOptions([
                    {label: 'Experienced',description: 'Select if Experienced',value: 'Exp',emoji: '<:EZ:512188097224769546>'},
                    {label: 'Learner',description: 'Select if Learning',value: 'Learn',emoji: "<:sancho:902187284638609439>"}
                ]).setMinValues(3).setMaxValues(3);
                reactionString = `Use the drop down menu below to vote for the raid you'd like, if you want to be on the sub team or main team and if you're learning or not.\nIf you want to remove your vote, then just select the same option again`;
            }
            // adds menu to event data
            eventData.select = select;
        }
        // if event is a teqaching of any sort it adds the teaching buttons 
        else if (Type == 'Teaching' || Type == 'Trio Teach') {
            eventData.button.push(learnButton, learnSubButton)
            reactionString = `Press ${eventData.emoji} if experienced. \nPress <:stoopid:744724504990973993> to be a substitute. \nPress <:sancho:902187284638609439> if a learner. \nPress <:waitwhat:689200429783187691> to be a substitute learner.`;
        }
        // changes the default button if it's a movie event
        else if (Event == 'Movie/TV Stream') {
            eventData.button=[expButton];
            eventData.button[0].setCustomId('schedule-Attendees');
            reactionString = `Press ${eventData.emoji} if you wish to join.`;
        }
        else if (['Iron Banner','Trials','Comp','Scrims'].includes(Event)) reactionString =`Press ${eventData.emoji} to be on the main team.\nPress <:stoopid:744724504990973993> to be a substitute.`
        else reactionString = `Press ${eventData.emoji} if experienced. \nPress <:stoopid:744724504990973993> to be a substitute.`;
        
        // adds favour text to description and sets up the component rows to hold buttons/menus
    	embedMsg.setDescription(typeString + '\n' + reactionString)
        
        const reactionRow = new Discord.MessageActionRow();
        const reactionRow2 = new Discord.MessageActionRow();
        
        // adds buttons/menus to rows and returns completed embed
        eventData.button.forEach((value) => { (reactionRow.components.length < 5)? reactionRow.addComponents(value) : reactionRow2.addComponents(value) });
        if (Event == 'Any Raid') return { embeds: [embedMsg], components: [new Discord.MessageActionRow().addComponents(eventData.select)]};
        else return { embeds: [embedMsg], components: (reactionRow2.components.length ? [reactionRow,reactionRow2] : [reactionRow]) };
    }
};