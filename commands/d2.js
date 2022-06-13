const utils = require('../utils.js');
const { roles, branchData } = require('../config.json');
const { SlashCommandBuilder } = require('@discordjs/builders');
const api = require('../api.js');
const config = require('../config.json');
const db = require('../db.js');

module.exports = {
	data: new SlashCommandBuilder()
	.setDescription('Gives D2 Clan member access')
    .setDefaultPermission(false)
	.addUserOption(option =>
			option.setName('member').setDescription('Mention a user to assign').setRequired(true))
	.addStringOption(option =>
			option.setName('branch')
				.setDescription('The branch to assign to')
				.setRequired(true)
                .addChoices(
                            {name:'Sovereign', value:'sm'},
                            {name:'Voracious', value:'vm'},
                            {name:'Opulent', value:'om'},
                            {name:'Enlightened', value:'em'},
                            {name:'Ascended', value:'am'}
    						))
    .addStringOption(option =>
			option.setName('url')
			.setDescription('Bungie URL')
			.setRequired(false)),

	async execute(interaction) {
        // puts off replying to interaction
        await interaction.deferReply()
		const branch = interaction.options.getString('branch')
		const memberObj = interaction.options.getMember('member')
        // gets handle to #general
		const generalChannel = interaction.guild.channels.cache.get('507449717798469652');
        const rolesToAdd = new Array(roles.assignables, roles.checkmark, roles.member, roles.my_branch, roles.about_me, roles.paranoid, branchData[branch].roleId);
		const rolesToRemove = new Array(roles.unassigned, roles.guest, roles.access);
        // gets URL and if specified, splits on any non word character
        const url = interaction.options.getString('url')?.split(/\W+/) ?? '';
        
        // searches split URL for platform and user id and then fetches bungie information for user
        const platId = url[url.indexOf("Profile")+1];
        const userId = url[url.indexOf("Profile")+2];
        const allInfo =  await api.getPlayer(platId,userId);
        
        if(url != '' && allInfo==null) {
            interaction.editReply({content: 'Bungie API down currently'});
            return null;
        }
        // messages that might be dmed to member
        const dmMessage = 
            'Welcome to the Madness family of clans, your new home! The staff team wishes you a warm welcome into our community.\r' +
            'You\'re receiving this message so that you have an easily accessible reference on what our many channels are for.\n' +
            '\n' +
            '**If you wish to learn about the clan:**\r' +
            '<#507467619335667733> contains important clan and game updates.\r' +
            '<#829855657511485501>, <#941530301551771648> and <#941532282014011493> are self-explanatory and  <#941527913008865290> contains branch information and more! Most of your questions will be answered in those channels.\r' +
            '<#608843230867619841> is where you can tell us a bit about yourself. Not mandatory, but highly recommended!\n' +
            '\n' +
            '**If you want to find fireteams:**\r' +
            '<#763054604165840926> Is where you can obtain opt in notifications to all sorts of activities. If you\'d like to receive a ping when someone is hosting, this is your go to place. \r' +
            '<#528308653883916308> Is where you can request fireteams, using any of pings that were on the role assignment list. Please make sure to read the group recruitment rules found in the pinned message.\r' +
            '<#722172438351183872> shows staff verified events or groups being hosted. These are the activities where you can be guaranteed a smooth run.\r' +
            '<#964545293846732880> has info on my commands that you can use to improve your Destiny experience' +
            '\n' +
            '**If you need help with something clan related:**\r' +
            '<#965066594457899008> is where you can have your basic needs answered, such as branch switches or questions for the staff team. If you\'re confused, please refer to the pinned message in the channel. Keep in mind this channel is *public*\r' +
            'I can also be messaged if you have a concern that you\'d like leadership to address *privately*, such as an issue with another member. You may also message your respective branch heads, who are listed in <#941527913008865290>\n' +
            'Please do not respond to me directly, unless you have a message for staff.';

        const sovMessage =
            '**You have been accepted into Sovereign**\r' +
            'Welcome to Sovereign, there are some additional things you need to know:\r' +
            '*There is a requirement to run 2 raids every 2 weeks to stay in the clan.*\r' +
            '*Everyone in every branch is required to stay active ingame - 15 days without activity warrants a kick. Please let staff know if you require a break due to IRL.*\r' +
            '*Everyone in every branch is required to be active in the Discord - 15 days without activity warrants a kick.*';

        const vorMessage =
            '**You have been accepted into Voracious**\r' +
            'Welcome to Voracious, there are some additional things you need to know:\r' +
            '*There is a requirement to PvP with clanmates bi-weekly to stay in the clan.*\r' +
            '*Everyone in every branch is required to stay active ingame - 15 days without activity warrants a kick. Please let staff know if you require a break due to IRL.*\r' +
            '*Everyone in every branch is required to be active in the Discord - 15 days without activity warrants a kick.*';

        const genMessage =
            '**You have been accepted into ' + branchData[branch].name + '**\r' +
            'Welcome to ' + branchData[branch].name + ', there are some additional things you need to know:\r' +
            '*Everyone in every branch is required to stay active ingame - 15 days without activity warrants a kick. Please let staff know if you require a break due to IRL.*\r' +
            '*Everyone in every branch is required to be active in the Discord - 15 days without activity warrants a kick.*';
       	
        // if the member hasn't been registered
        if  (memberObj.roles.cache.some(role => role.name === 'unassigned')){
        // Send DM
            try 
            {
                // send the general message then send the branch specific message
                await memberObj.user.send(dmMessage, { split: true });
                switch(branch) {
                    case 'sm':
                        memberObj.user.send(sovMessage, { split: true });
                        break;
                    case 'vm':
                        memberObj.user.send(vorMessage, { split: true });
                        break;
                    default:
                        memberObj.user.send(genMessage, { split: true });
                        break;
                }
                
                // registers user if there's bungie info 
                if (allInfo) {
                    // formats account info into string and sets up db info as object
        			const store =`${allInfo.membershipType}/${allInfo.membershipId}`;
            		const member = { Discord: memberObj.user.id, UserInfo: store, Records: 0 };
            		try {
                        // pushes info to db
                		db.userRegister(member).then(async _ => {
                            // adds and removes relevant roles
                            await memberObj.roles.add(rolesToAdd);
                            await memberObj.roles.remove(rolesToRemove);
                            // sets nickname
                            const name = await utils.validateName(memberObj,false);
                            memberObj.setNickname(name + ' ' + branchData[branch].symbol);
                            console.log(`${name} successfully registered`);
                            interaction.editReply({content: 'Done! Member successfully added to ' + branchData[branch].name, ephemeral: true});
                            // Send welcome
                            generalChannel.send(`Welcome to ${branchData[branch].name} Madness <@${memberObj.user.id}>! Please check your messages for all necessary info.\rIf the rules channel is blank, please refresh discord (CTRL-R).`);
                        });
                    } 
                    catch(error){console.log(error)}
                }
                else {interaction.editReply("No profile could be found for the specified URL")}
            }
            catch {interaction.editReply(`<@${memberObj.user.id}> couldn't be added to the clan, please make sure you can recieve DMs from server members`)}
        }
        else {
            // if not a new member, changes clan they're currently in
            const currentBranch = utils.getBranch(memberObj);
            // remove branch role if they have one
            if (currentBranch != undefined) {memberObj.roles.remove(currentBranch.roleId)}
            await memberObj.roles.add(branchData[branch].roleId);
            const name = await utils.validateName(memberObj)
            memberObj.setNickname(name);
            await interaction.editReply({content: 'Done! Member successfully moved to ' + branchData[branch].name, ephemeral: true});
        }
    },
};