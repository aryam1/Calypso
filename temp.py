import datetime
import json
import time
import requests
import traceback

data_ = open('royale.json', encoding="utf8")
dataObj = json.load(data_)

header = {"X-API-Key" : "22f9b10c54ae40e8a1ad4c1295cacd25"}
root = "https://www.bungie.net/platform"

def act(memType, memId, charID, lastID):
    flag = False
    page = 0
    activities = []

    while not flag:
        resp = requests.get(root +
                            f"/Destiny2/{memType}/Account/{memId}/Character/{charID}/Stats/Activities/",
                            params={'count': 100, 'page' : page, 'mode' : 'None'},
                            headers=header).json()
        tempActivities = []

        if "Response" in resp:
            if "activities" in resp["Response"]:
                for activity in resp["Response"]["activities"]:
                    date = datetime.datetime.strptime(activity['period'][0:10], "%Y-%m-%d")

                    if date > datetime.datetime(2022, 6, 18):
                        tempActivities.append(activity['activityDetails']['instanceId'])
                    else:
                        flag = True
                        break
                if lastID in tempActivities: 
                    activities += tempActivities[0:tempActivities.index(lastID)]
                    flag = True
                    break
                else:
                    activities += tempActivities
        page += 1

    return activities


def get_pgcr(pgcr):
    time.sleep(0.05)
    return requests.get(root + f"/Destiny2/Stats/PostGameCarnageReport/{pgcr}/",
                                    headers= header).json()["Response"]["entries"]

memIds = [dataObj[x][y]["d2"].split("/")[1] for x in dataObj for y in dataObj[x]]

for clan in dataObj:
    whitelist = []
    for jim in dataObj[clan]:
        try:
            print(json.dumps(data, indent=4, sort_keys=True), jim)

            info = dataObj[clan][jim]["d2"].split("/")
            chars = dataObj[clan][jim]["chars"]


            for jimothy in chars:

                activities = act(info[0], info[1])
                    count = 0
                    for j1m in fireteam:
                        jimID = j1m['player0']["destinyUserInfo"]["membershipId"]

                        if jimID in memIds[clan]:
                            count += 1

                    if count > 1:
                        whitelist.append(activity)

                    data[clan][count] += 1
        except Exception:
            print(f"Error on {jim} \n {traceback.print_exc()}")

jims_.close()