const axios = require('axios');
const {api} = require('./token.json');


const destinyAPI = axios.create({
  baseURL: 'https://www.bungie.net/',
  headers: { 'X-API-Key': api },
});

module.exports = {
    // sends API request
    callAPI: async function(requestURL, params) {
        return await destinyAPI.get(requestURL, { params: params });
    },
    // gets player information based on cross-save/ most common platform
    getPlayer: async function(platform,id) {
        let error = false;
        // formats URL
        const requestURL = `/Platform/User/GetMembershipsById/${id}/${platform}`
        // gets data if valid URL
        const results = await this.callAPI(requestURL).catch(e=>error = true);
        const data = results.data?.Response;
        // error if no data
        if (error == true || data == undefined)  return null 
        // return cross-save data if exists otherwise return data of platform most recently logged into
        if ("primaryMembershipId" in data) return {"membershipType":data.destinyMemberships[0]?.crossSaveOverride, "membershipId": data?.primaryMembershipId};
        return data.destinyMemberships[0]
    },
    
    // gets bungie profile information
    getProfile: async function(membershipType,membershipId) {
        // formats URL and query parameters
        const requestURL = `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/LinkedProfiles/`;
        const params = { getAllMemberships: true };
        // gets data and sorts all the returned profiles
        let error = false;
        const resp = await this.callAPI(requestURL,params).catch(e=>error=true);
        if(error) return null;
        let profiles = (resp.data.Response.profiles.sort((a,b)=>new Date(b.dateLastPlayed)-new Date(a.dateLastPlayed)));
        // returns last accessed profile
        return profiles[0]
    },
    
    // gets current season number
    getSeason: async function() {
        // fetches the whole manifest
        const manifestURL = "Platform/Destiny2/Manifest/"
        const mani = await this.callAPI(manifestURL);
        // finds the url that holds the season information and queries it
        const requestURL = mani.data.Response.jsonWorldComponentContentPaths.en.DestinySeasonDefinition;
        const seasonResp = await this.callAPI(requestURL);
        // extracts obejcts of season data
        const seasons = Object.values(seasonResp.data)
        // finds seasons with redacted information
        let redacted = seasons.filter(s=>s.displayProperties.name.includes('[Redacted]'))
        // defines current season as total seasons minus redacted seasons
        return seasons.length - redacted.length;
    },
    // gets profiles of all members in a specific clan
    getClanMembers: async function(groupID) {
        const requestURL = `Platform/GroupV2/${groupID}/Members/`;
        let error = false;
        const resp = await this.callAPI(requestURL).catch(e=>error=true);
        if(error) return null;
        return resp.data.Response.results;
    },
    getCharacters: async function(membershipType,membershipId) {
        // formats URL and query parameters
        const requestURL = `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=200`;
        // gets data and sorts all the returned profiles
        let error = false;
        const resp = await this.callAPI(requestURL).catch(e=>error=true);
        if(error) return null;
        return resp.data.Response.characters.data
    },
    getRaids: async function(membershipType,membershipId,characterId){
        // formats URL and query parameters
        const requestURL = `/Platform/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities/?page=0&count=10&mode=4`;
        // gets data and sorts all the returned profiles
        let error = false;
        const resp = await this.callAPI(requestURL).catch(e=>error=true);
        if(error) return null;
        return resp.data.Response.activities
    }
};
