const {	SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const { roles } = require('../config.json');
const timezones = require('timezone-abbr-offsets');

module.exports = {
	data: new SlashCommandBuilder().setDescription('Add to Calendar').setDefaultPermission(false)
    .addStringOption(option => option.setName('event').setDescription('Event Name').setRequired(true))
    .addIntegerOption(option => option.setName('hour').setDescription('Hour:').setRequired(true))
    .addIntegerOption(option => option.setName('minutes').setDescription('Minutes:').setRequired(true))
    .addIntegerOption(option => option.setName('date').setDescription('Date:').setRequired(true))
    .addIntegerOption(option => option.setName('month').setDescription('Month:').setRequired(true))
    .addStringOption(option => option.setName('timezone').setDescription('Timezone: (UTC Default)').setRequired(false)),
    
	async execute(interaction) {
        // puts off replying to interaction
        await interaction.deferReply();
        const hr = interaction.options.getInteger('hour');
        var min= interaction.options.getInteger('minutes');
        var tz = interaction.options.getString('timezone');
        var dt = interaction.options.getInteger('date');
        var mth= interaction.options.getInteger('month');
        // gets the current year
        const yr = new Date().getFullYear();
        // converts timezone code to offset
        const tshift =tz?(timezones[tz.toUpperCase()] * 60 * 1000):0;
        // formats datetime options into a parseable string
        const tstamp = `${yr}-${mth}-${dt} ${hr}:${min}:00 UTC`;
        // calculates seconds since epoch
        const epoch = (Date.parse(tstamp)-tshift);
        const event = interaction.options.getString('event');
        // adds event to calendar with epoch time
        await db.calendarAdd([event,new Date(epoch),null]);
        interaction.editReply('Event Added')
    },
};