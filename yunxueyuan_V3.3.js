// ==UserScript==
// @name         test
// @namespace    http://tampermonkey.net/
// @version      3.3-test
// @description  objURL/objHTML ready
// @author       You
// @match        https://learning.sinotruk.com/*
// @icon         https://learning.sinotruk.com/images/medal/medal-1.png
// @grant        GM_addStyle
// @grant        GM_notification
// ==/UserScript==

(function () {
    'use strict';
    /////////////use strict/////////////////////////////////

    // 常用设置
    var setting = {
        intervalTime: 30 // 循环间隔30s
        , Responsetime: 5 // 打开新网页的时间，默认响应时间为10秒
        , review: false // 复习模式，完整挂机视频时长，默认关闭
        , drag: false // 当显示完成时，拖动进度条，默认开启
        , autosave: true  // 自动读取和保存列表
        , username: '' // 浏览器已记住密码可忽略
        , passwd: '' // 浏览器已记住密码可忽略
        , debug: true // 输出debug信息
        , keepLogin: true //自动登入
    }
    // 函数：显示通知
    function myalert(infoText) {
        if (typeof (GM_notification) == 'undefined') {
            console.log("不支持GM_notification, 转为console.log: " + infoText);
        }
        else {
            GM_notification({
                title: GM_info.script.nameinfoText,
                text: infoText,
                timeout: 3000, //- int- 通知多长时间后消失(可选，0 = 不消失)

            });
            debuglog("myalert: " + infoText);
        }
        return;
    }
    function debuglog(infoText) {
        if (setting.debug) console.log(infoText);
    }
    // 延时活动管理
    var objAct = {
        mainTimer: 0
        , t_getRegister: 0
        , t_isHTMLReady: 0
        , t_nextDl: 0
        , t_autoread: 0
        , t_nextHTML: 0
        , clearAll: function () {
            clearInterval(this.t_isHTMLReady);
            clearInterval(this.t_getRegister);
            clearInterval(this.mainTimer);
            clearTimeout(this.t_nextHTML);
        }
    }
    // URL的管理
    var objURL = {
        aurls: new Array()
        , courseN: 0
        , next: function () {
            this.courseN++;
            if (this.courseN >= this.aurls.length) {
                console.log("错误：已经为最后一个");
                this.courseN = this.aurls.length - 1;
            }
            else if (this.courseN < 0) {
                console.log("错误：已经为第一个");
                this.courseN = 0;
            }
            else {
                if (this.aurls[this.courseN] == '') {
                    console.log("错误: url为空, courseN = " + this.courseN);
                    return;
                }
            }

            // debuglog("objURL输出: " + this.courseN + " == " + this.aurls[this.courseN]);
            return this.aurls[this.courseN];
        }
        , last: function () {
            this.courseN--;
            if (this.courseN < 0) {
                console.log("错误：已经为第一个");
                this.courseN = 0;
            }
            else if (this.courseN >= this.aurls.length) {
                console.log("错误：已经为最后一个");
                this.courseN = this.aurls.length - 1;
            }
            else {
                if (this.aurls[this.courseN] == '') {
                    console.log("错误: url为空, courseN = " + this.courseN);
                    return '#/home';
                }
            }
            // debuglog("objURL输出: " + this.courseN + " == " + this.aurls[this.courseN]);
            return this.aurls[this.courseN];
        }
        , add: function (surl) {
            this.aurls[this.aurls.length] = surl;
        }
        , count: function () {
            return this.aurls.length;
        }
        , url: function () {
            if (this.courseN < 0) {
                console.log("错误：已经为第一个");
                this.courseN = 0;
            }
            else if (this.courseN >= this.aurls.length) {
                console.log("错误：已经为最后一个");
                this.courseN = this.aurls.length - 1;
            }
            else {
                if (this.aurls[this.courseN] == '') {
                    console.log("错误: url为空, courseN = " + this.courseN);
                    return '#/home';
                }
            }
            return this.aurls[this.courseN];
        }
        , progress: function () {
            myalert("====播放进度：" + (this.courseN + 1) + "/" + this.aurls.length + " ====");
        }
        , getCourseURLs: function () {
            // 函数：校验URL是否重复
            function isURLsame(url, array) {
                var flag = true;
                Array.from(array).forEach(item => {
                    if (item == url) flag = false;
                })
                return flag;
            }
            // 获取课程列表
            var k = 0; // 新增项计数
            var done = 0;  // 已完成项项计数
            var repeat = 0;  // 重复项计数
            var olist;  // 项列表
            var oanromal;  //链接列表
            var m = objURL.count();  // 原有列表长度
            var localurl = window.location.href; //当前地址
            // 不同页面地址，不同的获取方式
            if (localurl.indexOf('#/center') != -1) {
                olist = $("li div.btn-row")
            }
            else if (localurl.indexOf('#/study/course/index' != -1)) {
                olist = $("li.list-item")
            }
            // 遍历项列表，不重复的添加到sURLs里面，并统计
            Array.from(olist).forEach(item => {
                oanromal = $(item).find("a.normal")[0];
                if (setting.review) {
                    // 复习模式，所有链接均可
                    if (isURLsame(oanromal.href, this.aurls)) {
                        this.add(oanromal.href);
                        k++;
                    }
                    else repeat++;
                }
                else {
                    // 剔除已完成课程链接
                    if (item.innerText.indexOf("已完成") == -1) // 不是已完成的
                    {
                        if (isURLsame(oanromal.href, this.aurls)) {
                            this.add(oanromal.href);
                            k++;
                        }
                        else repeat++;
                    }
                    else done++;
                }
            });
            // 输出：
            var outputString = '通知：';
            if (repeat > 0) {
                outputString += repeat + "个视频链接重复，"
            }
            if (setting.review) {
                outputString += "已添加" + k + "个视频（已完成+未完成），共计" + objURL.count() + "个视频。";
            }
            else {
                outputString += "已添加" + k + "个视频（未完成），共计" + objURL.count() + "个视频。";
            }
            debuglog(outputString);
            myalert(outputString);
            // debuglog(sURLs);
        }
        , readFromFile: function (textContent) {
            // 从文件读取aurls
            var n = this.count();
            this.aurls = JSON.parse(textContent);
            console.log("读取文件：共输入" + this.count() + "个视频。")
        }
        , saveToFile: function () {
            // 函数：保存为文件下载；
            function download(filename, text) {
                var pom = document.createElement('a');
                pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                pom.setAttribute('download', filename);
                if (document.createEvent) {
                    var event = document.createEvent('MouseEvents');
                    event.initEvent('click', true, true);
                    pom.dispatchEvent(event);
                }
                else {
                    pom.click();
                }
            }
            download("aurls.txt", JSON.stringify(this.aurls.splice(this.courseN)));
            console.log("输出未播放URL-->aurls.txt");
        }
        , saveToLocalStorage: function () {
            // 保存aurl和courseN到local storage
            window.localStorage.setItem('courseN', this.courseN);
            window.localStorage.setItem('aurls', JSON.stringify(this.aurls));
            myalert("保存到网页");
        }
        , readFromLocalStorage: function () {
            // 从local storage读取aurl和courseN
            this.courseN = window.localStorage.getItem('courseN');
            this.aurls = JSON.parse(window.localStorage.getItem('aurls'));
            if (this.courseN == null || this.aurls == null) {
                myalert("网页未存储视频列表。");
                return;
            }
            myalert("已从网页读取视频列表，共" + objURL.courseN + "/" + objURL.count() + "条");
            return;
        }
        , clearLocalStorage: function () {
            window.localStorage.removeItem('courseN');
            window.localStorage.removeItem('aurls');
            myalert("已清空网页存储。");
        }
    }
    // 视频动作管理
    var objVideo = {
        myvideo: new Object
        , playing: false
        , getVideo: function () {
            var video = $("iframe#myFrame").contents().find("video")[0];
            //判断是否解析到视频
            if (video == undefined) {
                video = myFrame.contentWindow.$("iframe")[0].contentWindow.scormIframe.contentWindow.$("video")[0]; // 获取三层iframe下的video
            }
            if (video == undefined) {
                // debuglog("getVideo:未找到视频对象");
                return false;
            } else {
                this.myvideo = video;
                this.playing = !video.paused;
                // debuglog("getVideo:找到视频对象");
                return true;
            }
        }
        , play: function () {
            this.getVideo();
            if (this.playing == false) {
                $("iframe#myFrame").contents().find("button.videojs-referse-btn")[0].click();
                $("iframe#myFrame").contents().find("img.register-img")[0].click();
            }
            this.myvideo.play();
            this.showProgress();
        }
        , mute: function () {
            this.myvideo.muted = true;//静音
        }
        , showProgress: function () {
            console.log("Video进度：" + (this.myvideo.currentTime / this.myvideo.duration * 100).toFixed(3) + '%');
        }
        , removeWaterMark: function () {
            myFrame.contentWindow.$("div.vjs-barrage").remove(); //移除浮窗
        }
        , isFinished: function () {
            return (this.myvideo.duration - this.myvideo.currentTime < 0.1);
        }
        , forward: function () {
            if (this.myvideo.duration - this.myvideo.currentTime > setting.intervalTime) {
                this.myvideo.currentTime = this.myvideo.duration - 10;
                debuglog("拖动进度");
            }
        }

    }
    // 列表管理
    var objList = {
        mylist: new Object
        , index: 0
        , type: new Array()
        , complete: new Array()
        , allComplete: false
        , init: function () {
            this.type = new Array();
            this.complete = new Array();
        }
        , getList: function () {
            this.mylist = $("iframe#myFrame").contents().find("dl"); // 获取项目列表
            if (this.mylist.length > 0) {
                // debuglog("getList:共获取" + this.mylist.length + "条视频");
                var tag = true;// 全部完成标记
                var sType;
                var sComplete;
                for (var j = 0; j < this.mylist.length; j++) {
                    // console.log(j+":"+this.mylist[j])
                    sType = $(this.mylist[j]).find("div.sub-text.focus")[0].innerText;  // 视频类别
                    sComplete = $(this.mylist[j]).find("span")[0].innerText == "已完成";  // true or false
                    // 是否全部完成
                    if (sType == '视频' || sType == 'H5') {
                        if (sComplete != true) {
                            tag = false;
                        }
                    }
                    else {
                        sComplete = true; // 如果不是视频，则为已完成
                    }
                    this.type[j] = sType;
                    this.complete[j] = sComplete;
                    // focus特殊内容
                    if (this.mylist[j].className.indexOf('focus') != -1) {
                        this.index = j;
                    }
                }
                this.allComplete = tag;
                return true;
            }
            else {
                // debuglog("getList:未获取到list.");
                return false;
            }
        }
        , refresh: function () {
            if (this.allComplete == false) {
                this.mylist = $("iframe#myFrame").contents().find("dl"); // 获取项目列表
                if (this.mylist.length > 0) {
                    // debuglog("getList:共获取" + this.mylist.length + "条视频");
                    var tag = true;// 全部完成标记
                    var sType;
                    var sComplete;
                    for (var j = 0; j < this.mylist.length; j++) {
                        // console.log(j+":"+this.mylist[j])
                        sType = $(this.mylist[j]).find("div.sub-text.focus")[0].innerText;  // 视频类别
                        sComplete = $(this.mylist[j]).find("span")[0].innerText == "已完成";  // true or false
                        // 是否全部完成
                        if (sType == '视频' || sType == 'H5') {
                            if (sComplete != true) {
                                tag = false;
                            }
                        }
                        else {
                            sComplete = true; // 如果不是视频，则为已完成
                        }
                        // debuglog("i= " + j + ":" + typeof (sType));
                        // debuglog("i= " + j + ":" + typeof (this.type[j]));
                        // this.type[j] = sType;
                        this.complete[j] = sComplete;
                        // focus特殊内容
                        if (this.mylist[j].className.indexOf('focus') != -1) {
                            this.index = j;
                        }
                    }
                    this.allComplete = tag;
                    return true;
                }
                else {
                    // debuglog("getList:未获取到list.");
                    return false;
                }
            }
        }
        , getCurrentIndex: function () {
            for (var j = 0; j < this.mylist.length; j++) {
                if (this.mylist[j].className.indexOf('focus') != -1) {
                    this.index = j;
                    return j; // 返回[0,length-1]
                }
            }
            return -1;
        }
        , isComplete: function () {
            var sComplete = $(this.mylist[this.index]).find("span")[0].innerText; //当前dl
            this.complete = (sComplete == "已完成");
            return (sComplete == "已完成");
        }
        , isVideo: function () {
            var sType = $(this.mylist[this.index]).find("div.sub-text.focus")[0].textContent;
            this.type[this.index] = sType;
            return (sType == '视频' || sType == 'H5');
        }
        , isAllComplete: function () {
            for (var i = 0; i < this.complete.length; i++) {
                if (this.type[i] == '视频' || this.type[i] == 'H5') {
                    if (this.complete[i] == false) {
                        return false;
                    }
                }
            }
            return true;
        }
        , nextDl: async function () {
            var list = this.mylist; // 获取项目列表
            for (var j = 0; j < list.length; j++) {
                // 列表第j个的类别：视频/H5 则判断是否完成，若为其他则默认完成
                var sType = $(list[j]).find("div.sub-text")[0].textContent
                if (sType == '视频' || sType == 'H5') {
                    if ($(list[j]).find('div.pointer span')[0].innerText != '已完成') {
                        if (this.allComplete != true) {
                            console.log("列表第" + (j + 1) + "个视频未完成")
                            list[j].click();  // 未完成则点击跳转
                            await new Promise(function () {
                                // 检测播放情况
                                objAct.t_nextDl = setTimeout(() => {
                                    objVideo.play();
                                }, setting.Responsetime * 1000 * 0.6);
                            })

                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }
    // 框架管理
    var objFrame = {
        ready: false
        , url: function () {
            var iframe = $("iframe#myFrame")[0];
            return iframe.contentWindow.location.href;
        }
        , addFrame: function (courseURL, isIntval = true) {
            var iframe;
            // 判断是存在iframe，不存在就创建，存在就转到
            if ($("iframe#myFrame").length == 0) {
                debuglog("第一次增加Frame");
            }
            else {
                // 初始化
                objAct.clearAll();
                objList.init();
                this.ready = false;
                $("iframe#myFrame").remove();
            }
            iframe = document.createElement("iframe");
            iframe.id = "myFrame";
            document.body.appendChild(iframe);
            iframe.height = "100%";
            iframe.width = "100%";
            iframe.scrollIntoView();
            iframe.src = courseURL;
            iframe.onload = function () {
                objFrame.isHTMLReady(isIntval);
            }
        }
        , getRegister: function () {
            // 获取register图标
            var register = $("iframe#myFrame").contents().find("button.videojs-referse-btn")[0];
            if (!(register == undefined)) {
                // 找到播放按钮，则点击播放
                if (objVideo.playing == false) {
                    $("iframe#myFrame").contents().find("button.videojs-referse-btn")[0].click();
                    $("iframe#myFrame").contents().find("img.register-img")[0].click();
                }
                debuglog("getRegister:找到播放按钮, paly video");
                return true;
            }
            else {
                // debuglog("getRegister:未找到播放按钮");
                return false;
            }

        }
        , isHTMLReady: async function (isIntval) {
            // 获取网页list
            var state = true;
            await new Promise(function (resolve, reject) {
                var i = 0;
                objAct.t_isHTMLReady = setInterval(() => {
                    i++;
                    // 循环response*3倍的时间，请勿修改20
                    if (objList.getList()) {
                        clearInterval(objAct.t_isHTMLReady);
                        resolve(true);
                    }
                    if (i > 20 * 3) {
                        clearInterval(objAct.t_isHTMLReady);
                        state = false;
                        resolve('false');
                    }
                }, setting.Responsetime * 1000 / 20);
            });
            // 获取到List再继续
            if (state) {
                // 是否需要学习
                if (setting.review) {// 需要复习则从第一个开始
                    objList.mylist[0].click(); // 点击第一个视频项DL
                    objList.getList();
                }
                else { //不需要复习
                    // 判断是否全部完成
                    if (objList.allComplete) {
                        // 全部完成，则下一个
                        objAct.t_nextHTML = setTimeout(() => {
                            objFrame.nextHTML();
                        }, 5000);
                        return;
                    }
                    else { // 未全部完成
                        // 点击第一个未完成的视频dl
                        objList.getList();
                    }
                }

                // 当前List是否为视频
                if (objList.isVideo()) {
                    // 获取网页register
                    new Promise(function (resolve, reject) {
                        var i = 0;
                        objAct.t_getRegister = setInterval(() => {
                            i++;
                            if (objFrame.getRegister()) {
                                clearInterval(objAct.t_getRegister);
                                resolve(true);
                            }
                            if (i > 20) {
                                clearInterval(objAct.t_getRegister);
                            }
                        }, setting.Responsetime * 1000 / 20);
                    });
                    // 获取网页Video，时间*2
                    await new Promise(function (resolve, reject) {
                        var i = 0;
                        objAct.t_isHTMLReady = setInterval(() => {
                            i++;
                            if (objVideo.getVideo()) {
                                clearInterval(objAct.t_isHTMLReady);
                                resolve(true);
                            }
                            if (i > 20 * 2) {
                                clearInterval(objAct.t_isHTMLReady);
                                state = false;
                                resolve(false);
                            }
                        }, setting.Responsetime * 1000 / 20);
                    });
                }
                else {
                    // 出错;                    
                }
            }
            else {
                myalert("获取List state出错，已停止。");
                return false;
            }
            //  更新状态，设置循环
            if (state) {
                this.ready = true;
                objVideo.removeWaterMark();
                debuglog("网页加载完成。");
                // 是否设置循环
                if (isIntval) {
                    setTimer();
                }
            }
            return state;
        }
        , nextHTML: function () {
            // 清除主循环设置
            objAct.clearAll();
            // 如果是倒数第二个
            if (objURL.courseN < objURL.aurls.length - 1) {
                objFrame.addFrame(objURL.next(), true);// 下一个html
                objURL.progress();
            }
            else {
                // 最后一个，
                if (setting.autosave) {
                    objURL.saveToLocalStorage();
                    console.log("aurls和courseN保存到网页。");
                }
                //判断是否在前台。
                // document.addEventListener("visibilitychange", function () {
                //     var string = document.visibilityState
                //     // console.log(string)                    
                //     if (string === 'hidden') {  // 当页面由前端运行在后端时，出发此代码
                //         myalert("列表已全部完成。");
                //         // console.log('我被隐藏了')
                //     }
                //     if (string === 'visible') {   // 当页面由隐藏至显示时
                //         alert("列表已全部完成。");
                //         console.log("列表已全部完成。");
                //         // console.log('欢迎回来')
                //     }
                // });
                myalert("列表已全部完成。");
                return;
            }

            // autosave: 每5个输出一次列表
            if (setting.autosave && objURL.courseN % 5 == 4) {
                objURL.saveToLocalStorage();
                console.log("aurls和courseN保存到网页。");
            }
        }
        , lastHTML: function () {
            // 清除所有循环
            objAct.clearAll();
            if (objURL.courseN > 0) {
                objFrame.addFrame(objURL.last(), true);// 上一个html
                objURL.progress();
            }
        }
        , startHTML: function () {
            if (objURL.count() == 0) {
                myalert("播放列表为空，请添加视频到列表。");
                return;
            }
            if (objURL.courseN == objURL.count() - 1) {
                myalert("播放到列表最后一个，从头开始播放。");
                objURL.courseN = 0;
            }
            else {
                myalert("开始播放视频列表。");
            }
            var surl = objURL.url()
            objFrame.addFrame(objURL.url(surl), true);
            // objAct.t_nextHTML = setTimeout(() => {
            //     setTimer();// 设置主循环
            // }, setting.Responsetime * 1000);
        }
    }

    // 设置自动连播
    function setTimer() {
        objAct.mainTimer = setInterval(() => {
            objList.refresh();
            // 分类判断
            if (objList.isVideo() == true) {
                // 判断视频是否显示已完成
                if (objList.complete[objList.index] == true) {
                    // 判断视频是否已经结束
                    if (objVideo.isFinished() == true) {
                        // 判断是否全部dl都完成了
                        if (objList.allComplete == true) {
                            objFrame.nextHTML();
                            console.log("setTimer:视频已全部完成：下一个HTML");
                        }
                        else {
                            objList.nextDl(); //未全部完成，点击未完成dl
                            console.log("setTimer:视频未全部完成：点击下一个dl");
                        }
                    }
                    else {
                        // 拖动进度
                        if (setting.review || !setting.drag) {
                            objVideo.play();
                            debuglog("setTimer:拖动进度，play");
                        }
                        else {
                            objVideo.forward();
                            console.log("setTimer:拖动进度，forward");
                        }

                    }
                }
                else {
                    // 未完成，等待结束，检测是否播放
                    objVideo.play();
                    debuglog("setTimer: 未完成，等待结束，检测是否播放");
                }
            }
            else {
                // 判断是否全部dl都完成了
                if (objList.allComplete == true) {
                    objFrame.nextHTML(); // 全部完成，下一个html
                    console.log("所有dl已全部完成: 下一个HTML");
                } else {
                    objList.nextDl();//未全部完成，点击未完成dl
                    console.log("非视频项，未全部完成，点击下一个dl");
                }
            }
        }, setting.intervalTime * 1000);
    }
    // 手动设置
    function start() {
        objURL.getCourseURLs();

    }





    // auto Read URL
    function initURL() {
        if (setting.autosave == true) {
            // 读取网页内保存的。
            objURL.readFromLocalStorage();
            // 关闭网页前保存。
            window.onbeforeunload = function () {
                objURL.saveToLocalStorage();
            }
        }
    }

    // 功能函数：添加按钮
    function createButton(parentNode, ele_id, ele_className, ele_text) {
        var obtn = document.createElement("button");
        obtn.id = ele_id;
        obtn.className = ele_className;
        obtn.textContent = ele_text;
        parentNode.appendChild(obtn);
    }

    //////////////////////////////////////////////////////
    //                  主程序                           //
    //////////////////////////////////////////////////////

    const localurl = window.location.href; //当前地址
    // 添加按钮
    if (localurl.indexOf('/oauth/#login') != -1) { // 登入页面
        if (setting.keepLogin) {
            setTimeout(() => {
                if (!($("input[id$='username']")[0].value && $("input[id$='pword']")[0].value)) {
                    $("input[id$='username']")[0].value = setting.username;
                    $("input[id$='pword']")[0].value = setting.passwd;
                    $("button[id$='login']")[0].click();
                }
                else {
                    $("button[id$='login']")[0].click();
                }
            }, setting.Responsetime * 1000 * 0.2);
        }
    }
    else if (localurl.indexOf('#/home') != -1 ||
        localurl.indexOf('#/study/course/index') != -1 ||
        localurl.indexOf('#/center') != -1) { // 主页面
        // 添加style样式
        GM_addStyle(`
        .button1 {
            width: 80px;
            height: 25px;
            background: linear-gradient(315deg, rgb(137, 216, 211) 0%, rgb(3, 200, 168) 75%);
            border: 3px;
            border-radius: 10px;
            font-weight: 50;
            font-size: 10px;
            color: rgb(0, 0, 0);
            opacity:0.2;
            outline: none;
            position: relative;
            transition: all 0.3s
        }
        .button1:hover{
            background: linear-gradient(315deg, rgb(137, 216, 211) 0%, rgb(3, 200, 168) 75%);
            transform:scale(1.2);
            transform:translate(-55px);
            opacity:1
        }
        .button-container {
            width:90px;
            height:150px;
            top: 10px;
            position: absolute;
            right: -75px
        }
        `);
        // 添加按钮container
        var obj = document.createElement("div");
        obj.id = 'xxxnav';
        obj.style = "position: fixed;top:0;right:0px;z-index:9999;width:0px;height:100%";
        var odiv = document.createElement("div");
        odiv.id = "button-container";
        odiv.className = "button-container";
        obj.appendChild(odiv);
        document.body.appendChild(obj);
        // 按钮1：获取链接
        createButton(odiv, 'addURLs', 'button1', '1.添加列表')
        $("#addURLs")[0].onclick = function () {
            objURL.getCourseURLs();
        }

        // 按钮2：添加播放按钮
        createButton(odiv, 'listplay', 'button1', '播放视频')
        $("#listplay")[0].onclick = function () {
            objFrame.startHTML();
        }
        // 按钮3：停止播放按钮
        createButton(odiv, 'liststop', 'button1', '停止播放')
        $("#liststop")[0].onclick = function () {
            objAct.clearAll();
        }
        // 按钮4：保存为文件
        createButton(odiv, 'saveurl', 'button1', '保存为文件')
        $("#saveurl")[0].onclick = function () {
            objURL.saveToFile();
        }
        // 读取文件的函数
        {
            const reader = new FileReader();
            reader.onload = function () {
                // aurls = JSON.parse(reader.result);
                objURL.readFromFile(reader.result);
                // myalert("已读取" + aurls.length + "条数据")
                myalert("已读取" + objURL.count() + "条数据")
            }
            var obtn = document.createElement("input");
            obtn.id = "fileInput";
            obtn.type = "file";
            obtn.onchange = function () {
                if (this.files.length == 0) {
                    console.log("请选择文件！");
                    return;
                }
                // console.log(this.files);
                reader.readAsText(this.files[0]);
            }
            document.body.appendChild(obtn);
        }
        GM_addStyle('#fileInput {display:none}');
        // 按钮5：读取列表
        createButton(odiv, 'readstorage', 'button1', '读取文件')
        $("#readstorage")[0].onclick = function () {
            $("#fileInput").click();
        }
        // 按钮6：保存到网页
        createButton(odiv, 'savetoStorage', 'button1', '写入storage')
        $("#savetoStorage")[0].onclick = function () {
            objURL.saveToLocalStorage();
        }
        // 按钮7：从网页读取
        createButton(odiv, 'readFromStorage', 'button1', '读取storage')
        $("#readFromStorage")[0].onclick = function () {
            objURL.readFromLocalStorage();
        }
        // 按钮8：从网页删除
        createButton(odiv, 'clearStorage', 'button1', '清空storage')
        $("#clearStorage")[0].onclick = function () {
            objURL.clearLocalStorage();
        }

        // 按钮9：下一个
        createButton(odiv, 'nextHtml', 'button1', '3.下一个')
        $("#nextHtml")[0].onclick = function () {
            // console.log(objURL.next());
            // objFrame.addFrame(objURL.next().substr(30));
            objFrame.nextHTML();
            debuglog("手动下一个");
        }
        // 按钮10：上一个
        createButton(odiv, 'lastHtml', 'button1', '4.上一个')
        $("#lastHtml")[0].onclick = function () {
            // console.log(objURL.last());
            objFrame.lastHTML();
            debuglog("手动上一个");
        }
        //隐藏右下悬浮按钮
        // GM_addStyle('.sidebar-toolbar {display:none}');
        // 是否自动读取
        objAct.t_autoread = setTimeout(() => {
            initURL();
        }, setting.Responsetime * 1000);

        window.onbeforeunload = function () {
            clearTimeout(objAct.t_autoread);
        }

    }
    else if (localurl.indexOf('#/study/course/detail/') != -1) { // 子页面
        GM_addStyle('.sidebar-toolbar {display:none}');
    }
    else {
        debuglog("未获取到网址")
    }




    ///////////EOF//////////////
    // Your code here...
})();
