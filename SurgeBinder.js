function parseINIString(data) {
    const regex = {
        section: /^\s*\[(.*?)\]\s*$/,
        param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    const value = {};
    const lines = data.split(/[\r\n]+/);
    let section = null;

    lines.forEach(line => {
        if (regex.comment.test(line)) {
            // 这是注释行，忽略
        } else if (regex.param.test(line)) {
            const match = line.match(regex.param);
            if (section) {
                value[section][match[1]] = match[2];
            } else {
                value[match[1]] = match[2];
            }
        } else if (regex.section.test(line)) {
            const match = line.match(regex.section);
            section = match[1];
            value[section] = {};
        }
    });

    return value;
}

function jsonToINI(json) {
    let iniString = ''; // 初始化INI字符串

    // 遍历JSON对象的每个键
    for (const key in json) {
        if (json.hasOwnProperty(key)) {
            const element = json[key];

            // 检查元素是否为对象（即一个section）
            if (typeof element === 'object' && element !== null && !(element instanceof Array)) {
                // 对于对象，先添加节名称
                iniString += `[${key}]\n`;

                // 然后遍历对象的每个键值对并添加到字符串
                for (const itemKey in element) {
                    if (element.hasOwnProperty(itemKey)) {
                        iniString += `${itemKey} = ${element[itemKey]}\n`;
                    }
                }
            } else {
                // 如果不是对象，直接添加键值对
                iniString += `${key} = ${element}\n`;
            }
        }
    }

    return iniString;
}

function readConfigFile(filePath) {
    let data;
    try {
        const fs = require('fs');
        data = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(err);
        data = $persistentStore.read(filePath)
    }
    // console.log(data);
    const config = parseINIString(data);
    return config;
}

function get_all_re_dict(filePathList, specificStrings, regexrule = null) {
    let all_re_dict = {};
    filePathList.forEach(filePath => {
        const config = readConfigFile(filePath);
        let filteredProxy = {};
        if (regexrule) {
            for (let key in config.Proxy) {
                if (regexrule.test(key)) {
                    filteredProxy[key] = config.Proxy[key];
                }
            }
        } else {
            filteredProxy = config.Proxy;
        }
        if (filteredProxy) {
            filteredProxy = filterDictionary(filteredProxy, specificStrings);
            all_re_dict = { ...all_re_dict, ...filteredProxy };
        }
    });
    return all_re_dict;
}

function filterDictionary(dict, specificStrings) {
    // 遍历字典的所有键
    Object.keys(dict).forEach(key => {
        // 检查当前键是否包含specificStrings数组中的任何一个字符串
        if (specificStrings.some(specificString => key.includes(specificString))) {
            // 如果包含，则删除该键
            delete dict[key];
        }
    });
    return dict;
}

function generateConfig(ConfigFilesList, combineConfig, GroupName, AutoGroupName, regexrule) {
    const all_re_dict = get_all_re_dict(ConfigFilesList, specificStrings, regexrule);
    var keys = Object.keys(all_re_dict);
    const ProxiesString = keys.join(', ');
    const GroupString = `select, ${AutoGroupName}, ${ProxiesString}`;
    // const AutoGroupString = `url-test, ${ProxiesString}, url=http://www.gstatic.com/generate_204, interval=43200`;
    const AutoGroupString = `smart, ${ProxiesString}`;
    combineConfig["Proxy Group"][GroupName] = GroupString;
    combineConfig["Proxy Group"][AutoGroupName] = AutoGroupString;
}

ConfigFilesList = ['sub.conf', 'subscribe2.conf', 'subscribe.conf'];
specificStrings = ["剩余", "套餐到期", "网站", "有问题切换节点", "优先使用", "Email", "网址", "更新订阅", "Expire", "DIRECT", "Traffic"];
const NewConfigName = "merge.conf"

let mergedProxies = get_all_re_dict(ConfigFilesList, specificStrings);
mergedProxies = filterDictionary(mergedProxies, specificStrings);

let combineConfig = {}
combineConfig.Proxy = mergedProxies;
combineConfig["Proxy Group"] = {}

// set Proxy Group
generateConfig(ConfigFilesList, combineConfig, "Proxy", "auto");

regexrule = /美国|US|United States/i;
generateConfig(ConfigFilesList, combineConfig, "US", "USauto", regexrule);

regexrule = /GPT|Singapore|United States/i;
generateConfig(ConfigFilesList, combineConfig, "GPT", "GPTauto", regexrule);

regexrule = /倍率/i;
generateConfig(ConfigFilesList, combineConfig, "v2spacex", "v2spacexauto", regexrule);

data = jsonToINI(combineConfig);
// console.log(data);

// 使用fs.writeFile方法创建并写入文件
try{
    const fs = require('fs');
    fs.writeFile(NewConfigName, data, (err) => {
      if (err) {
        console.error('写入文件时发生错误:', err);
      } else {
        console.log('文件已成功保存。');
      }
    });
} catch (err) {
    $persistentStore.write(data, NewConfigName)
}