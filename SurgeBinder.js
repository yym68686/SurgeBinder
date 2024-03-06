const fs = require('fs');
const path = require('path');

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

function readConfigFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const config = parseINIString(data);
    return config;
}

function get_us_string(filePath) {
    // 示例：读取并解析配置文件
    // const filePath = path.join(__dirname, 'subscribe-mojie.conf');
    const config = readConfigFile(filePath);
    // console.log(config.Proxy);
    // console.log(Object.keys(config.Proxy));
    let us_list = Object.keys(config.Proxy).filter(item => /美国|US/i.test(item));
    // let us_list = Object.keys(config.Proxy).filter(item => item.includes("美国"));
    // console.log(us_list);
    const us_string = us_list.join(', ');
    // console.log(us_string);
    return us_string
}

function get_all_re_string(filePathList, regexrule) {
    let all_re_list = [];
    filePathList.forEach(filePath => {
        const config = readConfigFile(filePath);
        let us_list = Object.keys(config.Proxy).filter(item => regexrule.test(item));
        // console.log(us_list);
        all_re_list = all_re_list.concat(us_list);
        // console.log(all_re_list);
    })
    return all_re_list.join(', ');
}

function readConfigFilesAndMergeProxies(fileNames) {
    let mergedProxies = {};

    // 遍历文件名列表
    fileNames.forEach(fileName => {
      // 读取每个文件的配置
      const configFile = readConfigFile(fileName);
      // 检查配置文件中是否有Proxy部分，并合并到mergedProxies对象中
      if (configFile && configFile.Proxy) {
        mergedProxies = { ...mergedProxies, ...configFile.Proxy };
      }
    });

    return mergedProxies;
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

function GetProxyGroup(ConfigFilesList) {
    const mergedProxies = readConfigFilesAndMergeProxies(ConfigFilesList);
    // console.log(mergedProxies);
    var keys = Object.keys(mergedProxies);
    const ProxiesString = keys.join(', ');
    // console.log(ProxiesString);
    let ProxyGroupString = "select, auto, fallback, " + ProxiesString;
    let autoGroupString = "url-test, " + ProxiesString + ", url=http://www.gstatic.com/generate_204, interval=43200";
    let fallbackGroupString = "fallback, " + ProxiesString + ", url=http://www.gstatic.com/generate_204, interval=43200";
    return [ProxyGroupString, autoGroupString, fallbackGroupString];
}

const us_string = get_us_string('subscribe-mojie.conf');
// console.log(us_string);

ConfigFilesList = ['subscribe1.conf', 'subscribe2.conf'];
NewConfigName = "merge.conf"

// console.log(readConfigFile('subscribe-mojie.conf'));

regexrule = /美国|US/i;
all_re_string = get_all_re_string(ConfigFilesList, regexrule);
// console.log(all_re_string);
USGroupString = "select, usauto, " + all_re_string;
usautoGroupString = "url-test, " + all_re_string + ", url=http://www.gstatic.com/generate_204, interval=43200";

regexrule = /GPT/i;
all_re_string = get_all_re_string(ConfigFilesList, regexrule);
// console.log(all_re_string);
GPTGroupString = "select, GPTauto, " + all_re_string;
GPTautoGroupString = "url-test, " + all_re_string + ", url=http://www.gstatic.com/generate_204, interval=43200";

const mergedProxies = readConfigFilesAndMergeProxies(ConfigFilesList);
// console.log(mergedProxies);
var keys = Object.keys(mergedProxies);
const ProxiesString = keys.join(', ');
// console.log(ProxiesString);

// console.log(keys);

let [ProxyGroupString, autoGroupString, fallbackGroupString] = GetProxyGroup(ConfigFilesList);

combineConfig = readConfigFile('subscribe-mojie.conf')
combineConfig["Proxy Group"].Proxy = ProxyGroupString;
combineConfig["Proxy Group"].auto = autoGroupString;
combineConfig["Proxy Group"].fallback = fallbackGroupString;
combineConfig["Proxy Group"].US = USGroupString;
combineConfig["Proxy Group"].usauto = usautoGroupString;
combineConfig["Proxy Group"].GPT = GPTGroupString;
combineConfig["Proxy Group"].GPTauto = GPTautoGroupString;
combineConfig.Proxy = mergedProxies;
// console.log(combineConfig);

let newConfig = {};
newConfig["Proxy"] = combineConfig["Proxy"];
newConfig["Proxy Group"] = combineConfig["Proxy Group"];
// console.log(newConfig);
data = jsonToINI(newConfig);
// console.log(data);

// 使用fs.writeFile方法创建并写入文件
fs.writeFile(NewConfigName, data, (err) => {
  if (err) {
    console.error('写入文件时发生错误:', err);
  } else {
    console.log('文件已成功保存。');
  }
});