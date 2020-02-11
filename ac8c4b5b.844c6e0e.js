(window.webpackJsonp=window.webpackJsonp||[]).push([[29],{154:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return o})),n.d(t,"metadata",(function(){return c})),n.d(t,"rightToc",(function(){return u})),n.d(t,"default",(function(){return b}));var r=n(1),a=n(9),i=(n(0),n(167)),o={id:"debugging-runs-with-an-IDE",title:"Debugging qatools' runs in an IDE",sidebar_label:"Debugging with IDEs"},c={id:"debugging-runs-with-an-IDE",title:"Debugging qatools' runs in an IDE",description:"## Debugging with PyCharm",source:"@site/docs/debugging-runs-with-an-IDE.md",permalink:"/qaboard/docs/debugging-runs-with-an-IDE",editUrl:"http://gitlab-srv/common-infrastructure/qatools/edit/master/website/docs/debugging-runs-with-an-IDE.md",sidebar_label:"Debugging with IDEs",sidebar:"docs",previous:{title:"Triggering CI and third-party tools via the web application",permalink:"/qaboard/docs/triggering-third-party-tools"},next:{title:"Bit accuracy tests",permalink:"/qaboard/docs/bit-accuracy"}},u=[{value:"Debugging with PyCharm",id:"debugging-with-pycharm",children:[]},{value:"Debugging with VSCode",id:"debugging-with-vscode",children:[]}],l={rightToc:u};function b(e){var t=e.components,n=Object(a.a)(e,["components"]);return Object(i.b)("wrapper",Object(r.a)({},l,n,{components:t,mdxType:"MDXLayout"}),Object(i.b)("h2",{id:"debugging-with-pycharm"},"Debugging with PyCharm"),Object(i.b)("p",null,'Edit your "debug configurations" like this:'),Object(i.b)("ul",null,Object(i.b)("li",{parentName:"ul"},Object(i.b)("strong",{parentName:"li"},"Module name:")," qatools ",Object(i.b)("em",{parentName:"li"},'(make sure you select "module" not "script" in the dropdown menu).')),Object(i.b)("li",{parentName:"ul"},Object(i.b)("strong",{parentName:"li"},"Parameters:")," CLI parameters for ",Object(i.b)("inlineCode",{parentName:"li"},"qa"),": ",Object(i.b)("strong",{parentName:"li"},Object(i.b)("inlineCode",{parentName:"strong"},"run -i images/A.jpg")),"."),Object(i.b)("li",{parentName:"ul"},Object(i.b)("strong",{parentName:"li"},"Working directory:")," Check it\u2019s defined as the directory with ",Object(i.b)("em",{parentName:"li"},"qatools.yaml"),'. If this directory happens to have a subfolder named "qatools", use it.')),Object(i.b)("p",null,Object(i.b)("img",Object(r.a)({parentName:"p"},{src:"/img/pycharm-debugging-setup.png",alt:"pyCharm setup"}))),Object(i.b)("blockquote",null,Object(i.b)("p",{parentName:"blockquote"},"In some cases you'll also need to define as environment variables ",Object(i.b)("inlineCode",{parentName:"p"},"LC_ALL=en_US.utf8 LANG=en_US.utf8"))),Object(i.b)("h2",{id:"debugging-with-vscode"},"Debugging with VSCode"),Object(i.b)("p",null,"To configure debugging, the editor opens a file called ",Object(i.b)("em",{parentName:"p"},"launch.json"),". You want to add configurations that look like those:"),Object(i.b)("pre",null,Object(i.b)("code",Object(r.a)({parentName:"pre"},{className:"language-json"}),'{\n  "name": "qatools",\n  "type": "python",\n  "request": "launch",\n  "module": "qatools",\n  "args": [\n    "--", // needed...\n    "--help",\n  ]\n},\n')),Object(i.b)("pre",null,Object(i.b)("code",Object(r.a)({parentName:"pre"},{className:"language-json"}),'{\n  "--",\n  "--inputs-database",\n  ".",\n  "run",\n  "--input-path",\n  "tv/tv_GW1_9296x256_REMOSAIC_V1_FULL_X_HP_PDA1",\n}\n')),Object(i.b)("p",null,"Here is a more in-depth review of your options at ",Object(i.b)("a",Object(r.a)({parentName:"p"},{href:"https://code.visualstudio.com/docs/python/debugging"}),"https://code.visualstudio.com/docs/python/debugging")))}b.isMDXComponent=!0},167:function(e,t,n){"use strict";n.d(t,"a",(function(){return s})),n.d(t,"b",(function(){return d}));var r=n(0),a=n.n(r);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function c(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function u(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=a.a.createContext({}),b=function(e){var t=a.a.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):c({},t,{},e)),n},s=function(e){var t=b(e.components);return a.a.createElement(l.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},g=Object(r.forwardRef)((function(e,t){var n=e.components,r=e.mdxType,i=e.originalType,o=e.parentName,l=u(e,["components","mdxType","originalType","parentName"]),s=b(n),g=r,d=s["".concat(o,".").concat(g)]||s[g]||p[g]||i;return n?a.a.createElement(d,c({ref:t},l,{components:n})):a.a.createElement(d,c({ref:t},l))}));function d(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=n.length,o=new Array(i);o[0]=g;var c={};for(var u in t)hasOwnProperty.call(t,u)&&(c[u]=t[u]);c.originalType=e,c.mdxType="string"==typeof e?e:r,o[1]=c;for(var l=2;l<i;l++)o[l]=n[l];return a.a.createElement.apply(null,o)}return a.a.createElement.apply(null,n)}g.displayName="MDXCreateElement"}}]);