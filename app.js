const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

// 使用环境变量
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

// 获取颜色值，支持命名颜色和十六进制值
function getColorValue(color) {
    // 处理已命名的颜色
    const colorMap = {
      'red': '#cf5659',
      'green': '#3cb371',
      'pink': '#ed6ea0',
      'yellow': '#ffd700',
      'blue': '#5aa9e6',
      'cyan': '#00ffff',
      'purple': '#800080',
      'orange': '#ffa500',
      'lime': '#00ff00',
      'teal': '#008080',
      'black': '#000000',
      'white': '#ffffff',
      'gray': '#808080',
      'brown': '#a52a2a',
      'navy': '#000080',
      'violet': '#ee82ee',
      'indigo': '#4b0082',
      'gold': '#ffd700',
      'silver': '#c0c0c0',
      'magenta': '#ff00ff'
    };
    
    // 如果是预定义颜色，返回其十六进制值
    if (colorMap[color.toLowerCase()]) {
      return colorMap[color.toLowerCase()];
    }
    
    // 如果已经是十六进制格式，直接返回
    if (color.startsWith('#')) {
      return color;
    }
    
    // 尝试解析为十六进制
    try {
      // 支持简写，如"f00"转为"#ff0000"
      if (/^[0-9a-f]{3}$/i.test(color)) {
        const r = color.charAt(0);
        const g = color.charAt(1);
        const b = color.charAt(2);
        return `#${r}${r}${g}${g}${b}${b}`;
      }
      
      // 支持6位十六进制
      if (/^[0-9a-f]{6}$/i.test(color)) {
        return `#${color}`;
      }
    } catch (e) {
      // 解析失败时返回默认蓝色
      return '#4F46E5';
    }
    
    // 默认返回蓝色
    return '#4F46E5';
  }

// 函数用于使颜色变亮
function lightenColor(hex, percent) {
    // 去掉#号
    hex = hex.replace('#', '');

    // 将十六进制转换为RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 使颜色变亮
    const lightenR = Math.min(255, r + (255 - r) * percent / 100);
    const lightenG = Math.min(255, g + (255 - g) * percent / 100);
    const lightenB = Math.min(255, b + (255 - b) * percent / 100);

    // 转回十六进制
    const lightenHex = '#' + 
        Math.round(lightenR).toString(16).padStart(2, '0') +
        Math.round(lightenG).toString(16).padStart(2, '0') +
        Math.round(lightenB).toString(16).padStart(2, '0');

    return lightenHex;
}

// 函数用于创建美观的渐变
function createGradient(colors, id = 'bgGradient') {
    // 处理颜色数组 - 保证至少有两种颜色
    const processedColors = colors.map(color => getColorValue(color));
    
    if (processedColors.length === 1) {
      // 如果只有一种颜色，创建该颜色的浅色版本
      processedColors.push(lightenColor(processedColors[0], 20));
    }
    
    // 创建渐变定义，使用传入的 id
    const gradientString = `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      ${processedColors.map((color, index) => 
        `<stop offset="${(index * 100) / (processedColors.length - 1)}%" stop-color="${color}" />`
      ).join('')}
    </linearGradient>`;
    
    return gradientString;
}

// 图标缓存
const iconCache = new Map();

// 获取图标数据
async function getIconData(iconPrefix, iconName, iconColor, iconSize) {
  // 如果没有指定图标，返回 home 图标
  if (!iconPrefix || !iconName) {
    iconPrefix = 'mdi';
    iconName = 'home';
  }
  
  const cacheKey = `${iconPrefix}:${iconName}:${iconColor}:${iconSize}`;
  
  // 如果图标已缓存，直接返回
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }
  
  try {
    // 构建 URL 参数
    const params = new URLSearchParams();
    if (iconSize) params.append('height', iconSize);
    if (iconColor) {
        let hexColor = getColorValue(iconColor);
        params.append('color', hexColor);
    }
    
    // 使用 Iconify API 获取图标
    const url = `https://api.iconify.design/${iconPrefix}/${iconName}.svg${params.toString() ? '?' + params.toString() : ''}`;
    const response = await axios.get(url, {
      responseType: 'text'
    });
    
    const svgContent = response.data;
    
    // 缓存图标数据
    iconCache.set(cacheKey, svgContent);
    return svgContent;
  } catch (error) {
    console.error(`获取图标失败: ${iconPrefix}/${iconName}`, error);
    
    // 如果获取失败且不是默认图标，尝试获取默认图标
    if (iconPrefix !== 'mdi' || iconName !== 'home') {
      console.log('尝试使用默认图标');
      return getIconData('mdi', 'home', iconColor, iconSize);
    }
    
    return null; // 图标获取失败
  }
}

// 获取背景图片 URL - 使用 Picsum Photos (Lorem Picsum)
function getPicsumBackground(id = '', width = 1500, height = 600) {
  // 如果提供了 ID，使用特定图片，否则随机获取
  if (id) {
    return `https://picsum.photos/id/${id}/${width}/${height}`;
  }
  // 随机图片 URL (每次请求都会返回不同图片)
  return `https://picsum.photos/${width}/${height}`;
}

// 获取 Pixabay 背景图
async function getPixabayBackground(query, width = 1500, height = 600) {
  try {
    // 使用 Pixabay 公开 API (不需要 API Key 但功能有限)
    const response = await axios.get(`https://pixabay.com/api/?key=${PIXBABY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&min_width=${width}&min_height=${height}&per_page=3`);
    
    if (response.data && response.data.hits && response.data.hits.length > 0) {
      // 返回第一个结果的 URL
      return response.data.hits[0].largeImageURL;
    }
    
    // 如果没有找到图片，返回空
    return null;
  } catch (error) {
    console.error(`获取 Pixabay 背景图失败: ${query}`, error);
    return null;
  }
}

// 获取 pexels 背景图
async function getPexelsBackground(query) {
  try {
    // 构造 Pexels 搜索 URL
    const searchUrl = `https://www.pexels.com/search/${encodeURIComponent(query)}/`;
    
    // 获取搜索结果页面
    const response = await axios.get(searchUrl);
    
    // 从 HTML 中提取第一个图片 URL
    // 注意：这种方法不稳定，可能会因网站结构变化而失效
    const html = response.data;
    const regex = /"https:\/\/images.pexels.com\/photos\/[^"]+?"/g;
    const matches = html.match(regex);
    
    if (matches && matches.length > 0) {
      // 返回第一个匹配的图片 URL (移除引号)
      return matches[0].replace(/"/g, '');
    }
    
    return null;
  } catch (error) {
    console.error(`获取 Pexels 背景图失败: ${query}`, error);
    return null;
  }
}

// 获取背景图
async function getBackgroundImage(params) {
  const { bg, bgservice = 'picsum', bgid } = params;
  
  // 如果没有指定背景服务或关键词，返回 null
  if (!bg && !bgid) {
    return null;
  }
  
  try {
    switch (bgservice.toLowerCase()) {
      case 'picsum':
        return getPicsumBackground(bgid); // 根据 ID 获取特定图片
      
      case 'pixabay':
        if (bg) {
          const pixabayUrl = await getPixabayBackground(bg);
          if (pixabayUrl) return pixabayUrl;
        }
        // 如果 Pixabay 失败或没有提供关键词，回退到 Picsum
        return getPicsumBackground(bgid);
      
      case 'pexels':
        if (bg) {
          const pexelsUrl = await getPexelsBackground(bg);
          if (pexelsUrl) return pexelsUrl;
        }
        // 如果 Pexels 失败或没有提供关键词，回退到 Picsum
        return getPicsumBackground(bgid);
      
      default:
        // 默认使用 Picsum
        return getPicsumBackground(bgid);
    }
  } catch (error) {
    console.error('获取背景图失败', error);
    // 出错时回退到 Picsum
    return getPicsumBackground();
  }
}

// 生成图案背景 - 更新版本
function generatePatternBackground(patternType = 'grid', colors) {
    let pattern = '';
    
    // 确保颜色是十六进制格式
    const mainColor = getColorValue(colors[0] || '#4F46E5');
    const secondColor = colors.length > 1 ? getColorValue(colors[1]) : lightenColor(mainColor, 30);
    
    switch (patternType) {
      case 'grid':
        pattern = `<pattern id="pattern-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="${mainColor}"/>
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${secondColor}" stroke-width="1"/>
        </pattern>`;
        return { pattern, fill: 'url(#pattern-grid)' };
      
      case 'dots':
        pattern = `<pattern id="pattern-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="${mainColor}"/>
          <circle cx="10" cy="10" r="2" fill="${secondColor}"/>
        </pattern>`;
        return { pattern, fill: 'url(#pattern-dots)' };
      
      case 'diagonal':
        pattern = `<pattern id="pattern-diagonal" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="${mainColor}"/>
          <path d="M0 40L40 0" stroke="${secondColor}" stroke-width="1"/>
        </pattern>`;
        return { pattern, fill: 'url(#pattern-diagonal)' };
      
      case 'waves':
        pattern = `<pattern id="pattern-waves" width="100" height="20" patternUnits="userSpaceOnUse">
          <rect width="100" height="20" fill="${mainColor}"/>
          <path d="M0 10C20 5, 30 15, 50 10C70 5, 80 15, 100 10" stroke="${secondColor}" stroke-width="1" fill="none"/>
        </pattern>`;
        return { pattern, fill: 'url(#pattern-waves)' };
      
      case 'hexagons':
        pattern = `<pattern id="pattern-hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse">
          <rect width="50" height="43.4" fill="${mainColor}"/>
          <path d="M25 0L50 14.4v28.9L25 43.3L0 28.9V14.4z" stroke="${secondColor}" stroke-width="1" fill="none"/>
        </pattern>`;
        return { pattern, fill: 'url(#pattern-hexagons)' };
      
      default:
        // 默认优化的渐变
        return { 
          pattern: '', 
          fill: `linear-gradient(135deg, ${mainColor}, ${secondColor})`
        };
    }
}

// // 根据参数创建SVG图片
// async function generateSVG(params) {
//   // 设置默认值
//   const { 
//     iconprefix, 
//     iconname,
//     content = '示例页面', 
//     bgcolor = 'blue,cyan', 
//     textcolor = '#FFFFFF',
//     iconcolor, // 可选的图标颜色，默认与文本颜色相同
//     iconsize = '100', // 默认图标尺寸
//     bg, // 背景图的关键词
//     bgservice, // 背景服务提供商
//     bgid, // 背景图的 ID
//     pattern // 图案背景类型
//   } = params;

//     // 处理背景色和文本色 - 转换命名颜色
//     // const bgColorInput = bgcolor || '#4F46E5';
//     // const textColorInput = textcolor || '#FFFFFF';

//     // 解析背景色和文本色
//     const bgColors = bgcolor.split(',').map(color => getColorValue(color.trim()));
//     const textColors = textcolor.split(',').map(color => getColorValue(color.trim()));
//     const iconColorInput = iconcolor || textColors[0];
//     const finalIconColor = getColorValue(iconColorInput.trim());

//     // 创建背景渐变
//     let backgroundFill = '';
//     if (bgColors.length > 1) {
//         backgroundFill = createGradient(bgColors, 'bgGradient');
//     }

//     // 创建文本渐变
//     let textFill = '';
//     if (textColors.length > 1) {
//         textFill = createGradient(textColors, 'textGradient'); // 文本使用水平渐变
//     }

//     // 获取图标
//     const iconSvg = await getIconData(iconprefix, iconname, finalIconColor, iconsize);

  
//   // 开始生成 SVG
//   let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
// <svg width="1500px" height="600px" viewBox="0 0 1500 600" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
//   <defs>
//     ${backgroundFill}
//     ${textFill}`;
  
//   // 如果使用图案背景，添加图案定义
//   let backgroundStyle = '';
//   if (pattern) {
//     const patternDef = generatePatternBackground(pattern, bgColors);
//     svg += `\n    ${patternDef.pattern}`;
//     backgroundStyle = patternDef.fill;
//   } else {
//     backgroundStyle = bgColors.length > 1 ? 'url(#bgGradient)' : bgColors[0];
//   }

//   svg += `\n  </defs>`;
  
//   // 添加背景
//   if (bg || bgid) {
//     // 尝试获取背景图
//     const bgImageUrl = await getBackgroundImage(params);
//     if (bgImageUrl) {
//       svg += `
//   <!-- 背景图 -->
//   <image width="1500" height="600" xlink:href="${bgImageUrl}" />`;
//     } else {
//       // 如果背景图获取失败，使用纯色或图案背景
//       svg += `
//   <!-- 背景 (图片获取失败) -->
//   <rect width="1500" height="600" fill="${backgroundStyle}" />`;
//     }
//   } else {
//     // 使用纯色或图案背景
//     svg += `
//   <!-- 背景 -->
//   <rect width="1500" height="600" fill="${backgroundStyle}" />`;
//   }
  
//   // 计算内容区域
//   const contentAreaWidth = 1170;
//   const contentAreaHeight = 230;
//   const contentX = (1500 - contentAreaWidth) / 2; // 水平居中
//   const contentY = (600 - contentAreaHeight) / 2; // 垂直居中
  
//   // 计算文本位置 (根据是否有图标调整)
//   const hasIcon = !!iconSvg;
//   const iconWidth = hasIcon ? parseInt(iconsize) + 30 : 0; // 图标宽度 + 间距
  
//   // 计算文本宽度 (估算值，每个字符约 50px)
//   const textWidth = content.length * 40;
  
//   // 计算整体内容宽度
//   const totalWidth = iconWidth + textWidth;
  
//   // 计算起始 X 坐标以实现水平居中
//   const startX = contentX + (contentAreaWidth - totalWidth) / 2;
  
//   // 添加内容区域 (图标和文本)
//   svg += `
//   <!-- 内容区域 (水平和垂直居中) -->
//   <g transform="translate(${startX}, ${contentY})">`;
  
//   // 添加图标 (如果有)
//   if (hasIcon) {
//     svg += `
//     <!-- 图标 -->
//     <g transform="translate(0, ${(contentAreaHeight - parseInt(iconsize)) / 2})">
//       ${iconSvg}
//     </g>`;
//   }
  
//   // 添加文本
//   svg += `
//     <!-- 文本 -->
//     <text 
//       x="${hasIcon ? iconWidth : 0}" 
//       y="${contentAreaHeight / 2}" 
//       font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" 
//       font-size="72" 
//       font-weight="bold" 
//       dominant-baseline="central"
//       fill="${textColors.length > 1 ? 'url(#textGradient)' : textColors[0]}"
//     >${content}</text>
//   </g>
// </svg>`;
  
//   return svg;
// }
// 根据参数创建SVG图片
async function generateSVG(params) {
  // 设置默认值
  const { 
    iconprefix, 
    iconname,
    content = '示例页面', 
    bgcolor = 'blue,cyan', 
    textcolor = '#FFFFFF',
    iconcolor, // 可选的图标颜色，默认与文本颜色相同
    iconsize = '100', // 默认图标尺寸
    bg, // 背景图的关键词
    bgservice, // 背景服务提供商
    bgid, // 背景图的 ID
    pattern, // 图案背景类型
    font = "'PingFang SC', 'Microsoft YaHei', sans-serif", // 新增字体参数
    text_size = '72' // 新增文本大小参数
  } = params;

  // 处理背景色和文本色
  const bgColors = bgcolor.split(',').map(color => getColorValue(color.trim()));
  const textColors = textcolor.split(',').map(color => getColorValue(color.trim()));
  const iconColorInput = iconcolor || textColors[0];
  const finalIconColor = getColorValue(iconColorInput.trim());

  // 创建背景渐变
  let backgroundFill = '';
  if (bgColors.length > 1) {
      backgroundFill = createGradient(bgColors, 'bgGradient');
  }

  // 创建文本渐变
  let textFill = '';
  if (textColors.length > 1) {
      textFill = createGradient(textColors, 'textGradient');
  }

  // 获取图标
  const iconSvg = await getIconData(iconprefix, iconname, finalIconColor, iconsize);

  // 开始生成 SVG
  let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="1500px" height="600px" viewBox="0 0 1500 600" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${backgroundFill}
    ${textFill}`;
  
  // 如果使用图案背景，添加图案定义
  let backgroundStyle = '';
  if (pattern) {
    const patternDef = generatePatternBackground(pattern, bgColors);
    svg += `\n    ${patternDef.pattern}`;
    backgroundStyle = patternDef.fill;
  } else {
    backgroundStyle = bgColors.length > 1 ? 'url(#bgGradient)' : bgColors[0];
  }

  svg += `\n  </defs>`;
  
  // 添加背景
  if (bg || bgid) {
    // 尝试获取背景图
    const bgImageUrl = await getBackgroundImage(params);
    if (bgImageUrl) {
      svg += `
  <!-- 背景图 -->
  <image width="1500" height="600" xlink:href="${bgImageUrl}" />`;
    } else {
      // 如果背景图获取失败，使用纯色或图案背景
      svg += `
  <!-- 背景 (图片获取失败) -->
  <rect width="1500" height="600" fill="${backgroundStyle}" />`;
    }
  } else {
    // 使用纯色或图案背景
    svg += `
  <!-- 背景 -->
  <rect width="1500" height="600" fill="${backgroundStyle}" />`;
  }
  
  // 计算内容区域
  const contentAreaWidth = 1170;
  const contentAreaHeight = 230;
  const contentX = (1500 - contentAreaWidth) / 2; // 水平居中
  const contentY = (600 - contentAreaHeight) / 2; // 垂直居中
  
  // 计算文本位置 (根据是否有图标调整)
  const hasIcon = !!iconSvg;
  const iconWidth = hasIcon ? parseInt(iconsize) + 30 : 0; // 图标宽度 + 间距
  
  // 计算文本宽度 (估算值)
  const textWidth = content.length * (parseInt(text_size) * 0.6);
  
  // 计算整体内容宽度
  const totalWidth = iconWidth + textWidth;
  
  // 计算起始 X 坐标以实现水平居中
  const startX = contentX + (contentAreaWidth - totalWidth) / 2;
  
  // 添加内容区域 (图标和文本)
  svg += `
  <!-- 内容区域 (水平和垂直居中) -->
  <g transform="translate(${startX}, ${contentY})">`;
  
  // 添加图标 (如果有)
  if (hasIcon) {
    svg += `
    <!-- 图标 -->
    <g transform="translate(0, ${(contentAreaHeight - parseInt(iconsize)) / 2})">
      ${iconSvg}
    </g>`;
  }
  
  // 添加文本
  svg += `
    <!-- 文本 -->
    <text 
      x="${hasIcon ? iconWidth : 0}" 
      y="${contentAreaHeight / 2}" 
      font-family="${font}" 
      font-size="${text_size}" 
      font-weight="bold" 
      dominant-baseline="central"
      fill="${textColors.length > 1 ? 'url(#textGradient)' : textColors[0]}"
    >${content}</text>
  </g>
</svg>`;
  
  return svg;
}

// 处理主请求 - 生成封面图片
app.get('/', async (req, res) => {
  try {
    const { 
      iconprefix, iconname, content, bgcolor, textcolor, iconcolor, iconsize,
      bg, bgservice, bgid, pattern
    } = req.query;
    
    const svg = await generateSVG({
      iconprefix,
      iconname,
      content,
      bgcolor,
      textcolor,
      iconcolor,
      iconsize,
      bg,
      bgservice,
      bgid,
      pattern
    });
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    console.error('生成SVG失败', error);
    res.status(500).send('生成图片失败');
  }
});

// 提供帮助页面
// app.get('/info', (req, res) => {
//   res.send(`
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <title>Notion Cover 生成器</title>
//       <meta charset="utf-8">
//       <style>
//         body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
//         label { display: block; margin: 10px 0 5px; }
//         input, select { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
//         .icon-group { display: flex; gap: 10px; }
//         .icon-group input, .icon-group select { flex: 1; }
//         button { background: #0070f3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
//         .preview { margin-top: 20px; border: 1px solid #eee; max-width: 100%; }
//         h1 { color: #333; }
//         .tips { color: #666; font-size: 0.9em; margin-top: 5px; }
//         .examples { margin-top: 20px; }
//         .examples h3 { margin-bottom: 10px; }
//         .example-list { display: flex; flex-wrap: wrap; gap: 10px; }
//         .example-item { cursor: pointer; border: 1px solid #eee; padding: 8px; border-radius: 4px; }
//         .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; margin-bottom: 10px; }
//         .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 10px 16px; transition: 0.3s; }
//         .tab button:hover { background-color: #ddd; }
//         .tab button.active { background-color: #0070f3; color: white; }
//         .tabcontent { display: none; padding: 6px 12px; border: 1px solid #ccc; border-top: none; }
//         .open { display: block; }
//       </style>
//     </head>
//     <body>
//       <h1>Notion Cover 生成器</h1>
      
//       <div class="tab">
//         <button class="tablinks active" onclick="openTab(event, 'Basic')">基本设置</button>
//         <button class="tablinks" onclick="openTab(event, 'Background')">背景设置</button>
//         <button class="tablinks" onclick="openTab(event, 'Advanced')">高级设置</button>
//       </div>
      
//       <div id="Basic" class="tabcontent open">
//         <div class="icon-group">
//           <div style="flex: 1;">
//             <label for="iconprefix">图标前缀:</label>
//             <input type="text" id="iconprefix" placeholder="例如: mdi">
//           </div>
//           <div style="flex: 1;">
//             <label for="iconname">图标名称:</label>
//             <input type="text" id="iconname" placeholder="例如: camera">
//           </div>
//           <div style="flex: 0.5;">
//             <label for="iconsize">图标尺寸:</label>
//             <input type="number" id="iconsize" placeholder="图标尺寸" value="100">
//           </div>
//         </div>
//         <div class="tips">前缀和名称组合使用，如 mdi + camera, bi + alarm, fluent-emoji-flat + alarm-clock</div>
        
//         <label for="content">内容:</label>
//         <input type="text" id="content" placeholder="页面标题" value="示例页面">
        
//         <div class="icon-group">
//           <div style="flex: 1;">
//             <label for="textcolor">文字颜色:</label>
//             <input type="text" id="textcolor" placeholder="单色或逗号分隔的多色" value="#FFFFFF">
//           </div>
//           <div style="flex: 1;">
//             <label for="iconcolor">图标颜色 (可选):</label>
//             <input type="text" id="iconcolor" placeholder="不填则使用文字颜色">
//           </div>
//         </div>
//       </div>
      
//       <div id="Background" class="tabcontent">
//         <h3>背景颜色</h3>
//         <label for="bgcolor">背景颜色:</label>
//         <input type="text" id="bgcolor" placeholder="单色或逗号分隔的多色" value="#4F46E5">
        
//         <h3>图案背景</h3>
//         <div class="icon-group">
//           <div style="flex: 1;">
//             <label for="pattern">图案类型:</label>
//             <select id="pattern">
//               <option value="">无图案</option>
//               <option value="grid">网格</option>
//               <option value="dots">圆点</option>
//               <option value="diagonal">对角线</option>
//               <option value="waves">波浪</option>
//               <option value="hexagons">六边形</option>
//             </select>
//           </div>
//         </div>
        
//         <h3>背景图片</h3>
//         <div class="icon-group">
//           <div style="flex: 1;">
//             <label for="bgservice">背景图服务:</label>
//             <select id="bgservice">
//               <option value="picsum">Picsum Photos</option>
//               <option value="pixabay">Pixabay</option>
//               <option value="pexels">Pexels</option>
//             </select>
//           </div>
//           <div style="flex: 1;">
//             <label for="bg">背景图关键词 (可选):</label>
//             <input type="text" id="bg" placeholder="例如: nature, office">
//           </div>
//         </div>
        
//         <div class="tips">优先级: 背景图 > 图案背景 > 背景颜色</div>
        
//         <label for="bgid">Picsum 图片 ID (可选):</label>
//         <input type="text" id="bgid" placeholder="留空则随机获取">
//         <div class="tips">访问 <a href="https://picsum.photos/" target="_blank">https://picsum.photos/</a> 获取图片 ID</div>
//       </div>
      
//       <div id="Advanced" class="tabcontent">
//         <p>目前没有高级选项，敬请期待...</p>
//       </div>
      
//       <button onclick="generatePreview()">生成预览</button>
      
//       <div>
//         <h3>预览:</h3>
//         <img id="preview" class="preview" alt="预览将显示在这里">
//       </div>
      
//       <div style="margin-top: 20px;">
//         <h3>链接:</h3>
//         <input type="text" id="link" readonly>
//       </div>
      
//       <div class="examples">
//         <h3>图标示例:</h3>
//         <div class="example-list">
//           <div class="example-item" onclick="setIcon('mdi', 'camera')">mdi/camera</div>
//           <div class="example-item" onclick="setIcon('bi', 'book')">bi/book</div>
//           <div class="example-item" onclick="setIcon('fluent-emoji-flat', 'alarm-clock')">fluent-emoji-flat/alarm-clock</div>
//           <div class="example-item" onclick="setIcon('heroicons', 'code')">heroicons/code</div>
//           <div class="example-item" onclick="setIcon('carbon', 'calendar')">carbon/calendar</div>
//           <div class="example-item" onclick="setIcon('tabler', 'note')">tabler/note</div>
//         </div>
//       </div>
      
//       <script>
//         function openTab(evt, tabName) {
//           var i, tabcontent, tablinks;
          
//           // 隐藏所有标签内容
//           tabcontent = document.getElementsByClassName("tabcontent");
//           for (i = 0; i < tabcontent.length; i++) {
//             tabcontent[i].style.display = "none";
//           }
          
//           // 取消所有按钮的 active 状态
//           tablinks = document.getElementsByClassName("tablinks");
//           for (i = 0; i < tablinks.length; i++) {
//             tablinks[i].className = tablinks[i].className.replace(" active", "");
//           }
          
//           // 显示当前标签并设置按钮为 active
//           document.getElementById(tabName).style.display = "block";
//           evt.currentTarget.className += " active";
//         }
        
//         function generatePreview() {
//           const iconprefix = document.getElementById('iconprefix').value;
//           const iconname = document.getElementById('iconname').value;
//           const iconsize = document.getElementById('iconsize').value || '100';
//           const iconcolor = document.getElementById('iconcolor').value;
//           const content = document.getElementById('content').value || '示例页面';
//           const bgcolor = document.getElementById('bgcolor').value || '#4F46E5';
//           const textcolor = document.getElementById('textcolor').value || '#FFFFFF';
//           const bg = document.getElementById('bg').value;
//           const bgservice = document.getElementById('bgservice').value;
//           const bgid = document.getElementById('bgid').value;
//           const pattern = document.getElementById('pattern').value;
          
//           let params = [];
          
//           if (iconprefix && iconname) {
//             params.push('iconprefix=' + encodeURIComponent(iconprefix));
//             params.push('iconname=' + encodeURIComponent(iconname));
//           }
          
//           params.push('content=' + encodeURIComponent(content));
//           params.push('bgcolor=' + encodeURIComponent(bgcolor));
//           params.push('textcolor=' + encodeURIComponent(textcolor));
//           params.push('iconsize=' + iconsize);
          
//           if (iconcolor) {
//             params.push('iconcolor=' + encodeURIComponent(iconcolor));
//           }
          
//           if (pattern) {
//             params.push('pattern=' + encodeURIComponent(pattern));
//           }
          
//           if (bg || bgid) {
//             if (bg) params.push('bg=' + encodeURIComponent(bg));
//             if (bgid) params.push('bgid=' + encodeURIComponent(bgid));
//             params.push('bgservice=' + encodeURIComponent(bgservice));
//           }
          
//           const url = '/?' + params.join('&');
//           document.getElementById('preview').src = url;
          
//           const fullUrl = window.location.origin + url;
//           document.getElementById('link').value = fullUrl;
//         }
        
//         function setIcon(prefix, name) {
//           document.getElementById('iconprefix').value = prefix;
//           document.getElementById('iconname').value = name;
//           generatePreview();
//         }
        
//         // 页面加载时生成默认预览
//         window.onload = function() {
//           generatePreview();
//         };
//       </script>
//     </body>
//     </html>
//   `);
// });
// 提供帮助页面
// 提供帮助页面
app.get('/info', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Notion Cover Generator</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        :root {
          --primary-color: #0070f3;
          --border-color: #e4e4e7;
          --bg-color: #f9fafb;
          --tab-active: #0070f3;
          --tab-active-text: white;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', Roboto, sans-serif;
          color: #333;
          background-color: var(--bg-color);
          line-height: 1.5;
        }
        .container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .main-area {
          display: flex;
          flex: 1;
        }
        .sidebar {
          width: 320px;
          background: white;
          border-right: 1px solid var(--border-color);
          padding: 20px;
          overflow-y: auto;
          max-height: calc(100vh - 40px);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .top-bar {
          display: flex;
          justify-content: space-between;
          padding: 10px 20px;
          background: white;
          border-bottom: 1px solid var(--border-color);
        }
        .preview-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .preview-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #f4f4f5;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
          min-height: 400px;
        }
        .preview-frame {
          max-width: 100%;
          max-height: 60vh;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .bottom-options {
          background: white;
          border-top: 1px solid var(--border-color);
          padding: 20px;
        }
        .bottom-tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .bottom-tab {
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .bottom-tab.active {
          border-bottom-color: var(--primary-color);
          color: var(--primary-color);
        }
        .bottom-content {
          display: none;
        }
        .bottom-content.active {
          display: block;
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        h2 {
          font-size: 18px;
          font-weight: 500;
          margin: 15px 0 10px;
        }
        .accordion {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .accordion-header {
          background-color: white;
          padding: 10px 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 500;
        }
        .accordion-header:hover {
          background-color: #f9fafb;
        }
        .accordion-content {
          padding: 15px;
          border-top: 1px solid var(--border-color);
          background-color: white;
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: #555;
        }
        input, select, textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary-color);
          outline: none;
        }
        button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #0058c7;
        }
        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
        }
        .btn-secondary:hover {
          background-color: #e5e7eb;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 20px;
        }
        .tab {
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          font-size: 14px;
        }
        .tab.active {
          border-bottom-color: var(--tab-active);
          color: var(--tab-active);
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
        }
        .template-item {
          border: 1px solid var(--border-color);
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
        }
        .template-item:hover {
          border-color: var(--primary-color);
        }
        .template-item img {
          width: 100%;
          height: auto;
          display: block;
        }
        .color-picker {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .color-input {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .color-input input[type="color"] {
          width: 150%;
          height: 150%;
          margin: -25%;
          padding: 0;
          border: none;
          cursor: pointer;
        }
        .visualizer {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        .visualizer label {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          margin-bottom: 0;
        }
        .icon-row {
          display: flex;
          gap: 10px;
        }
        .flex-row {
          display: flex;
          gap: 10px;
        }
        .flex-col {
          flex: 1;
        }
        .mt-10 {
          margin-top: 10px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          padding: 20px;
          font-size: 14px;
          color: #666;
          background: white;
          border-top: 1px solid var(--border-color);
        }
        .link-button {
          display: inline-block;
          padding: 8px 16px;
          background-color: #f3f4f6;
          color: #374151;
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .link-button:hover {
          background-color: #e5e7eb;
        }
        .template-preview {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
        }
        .template-card {
          border: 2px solid transparent;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
        }
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .template-card.active {
          border-color: var(--primary-color);
        }
        .generate-button {
          padding: 10px 20px;
          font-size: 16px;
          margin-top: 20px;
          width: 100%;
        }
        @media (max-width: 768px) {
          .main-area {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            max-height: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="top-bar">
          <h2>Notion Cover Generator</h2>
          <div>
            <a href="/" class="link-button" target="_blank">在新窗口打开</a>
            <button id="download-btn" class="btn-secondary">下载 SVG</button>
          </div>
        </div>
        
        <div class="main-area">
          <div class="sidebar">
            <div class="accordion">
              <div class="accordion-header" onclick="toggleAccordion('text-options')">
                <span>✏️ Text</span>
                <span>▼</span>
              </div>
              <div class="accordion-content" id="text-options">
                <div class="form-group">
                  <label for="content">文本内容</label>
                  <input type="text" id="content" placeholder="输入文本" value="BUBBLE">
                </div>
                <div class="form-group">
                  <label for="font">字体</label>
                  <select id="font">
                    <option value="Inter">Inter</option>
                    <option value="'PingFang SC', 'Microsoft YaHei', sans-serif">中文默认</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Times New Roman', serif" selected>Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="text-size">文本大小</label>
                  <input type="number" id="text-size" placeholder="文本大小" value="140">
                </div>
                <div class="form-group">
                  <label for="textcolor">文本颜色</label>
                  <div class="flex-row">
                    <div class="color-picker">
                      <div class="color-input">
                        <input type="color" id="textcolor" value="#FFFFFF">
                      </div>
                    </div>
                    <input type="text" id="textcolor-hex" placeholder="#FFFFFF 或 white" value="#fafafa">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="accordion">
              <div class="accordion-header" onclick="toggleAccordion('icon-options')">
                <span>🔣 Icon</span>
                <span>▼</span>
              </div>
              <div class="accordion-content" id="icon-options">
                <div class="form-group">
                  <label>图标选择</label>
                  <div class="icon-row">
                    <div class="flex-col">
                      <input type="text" id="iconprefix" placeholder="图标前缀 (如 mdi)" value="mdi">
                    </div>
                    <div class="flex-col">
                      <input type="text" id="iconname" placeholder="图标名称 (如 home)" value="home">
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="iconsize">图标大小</label>
                  <input type="number" id="iconsize" placeholder="图标大小" value="100">
                </div>
                
                <div class="form-group">
                  <label for="iconcolor">图标颜色 (可选)</label>
                  <div class="flex-row">
                    <div class="color-picker">
                      <div class="color-input">
                        <input type="color" id="iconcolor" value="#FFFFFF">
                      </div>
                    </div>
                    <input type="text" id="iconcolor-hex" placeholder="留空则使用文本颜色" value="">
                  </div>
                  <div class="mt-10">
                    <label><input type="checkbox" id="use-text-color" checked> 留空则使用文本颜色</label>
                  </div>
                </div>
                
                <div class="template-preview">
                  <div class="template-card" onclick="setIcon('mdi', 'home')">
                    <img src="/?iconprefix=mdi&iconname=home&content=&bgcolor=%23ec8c69&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="setIcon('bi', 'book')">
                    <img src="/?iconprefix=bi&iconname=book&content=&bgcolor=%23ec8c69&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="setIcon('tabler', 'note')">
                    <img src="/?iconprefix=tabler&iconname=note&content=&bgcolor=%23ec8c69&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="setIcon('fluent-emoji-flat', 'alarm-clock')">
                    <img src="/?iconprefix=fluent-emoji-flat&iconname=alarm-clock&content=&bgcolor=%23ec8c69&textcolor=%23FFFFFF" width="100%">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="accordion">
              <div class="accordion-header" onclick="toggleAccordion('visualizer-options')">
                <span>👁️ Visualizer</span>
                <span>▼</span>
              </div>
              <div class="accordion-content" id="visualizer-options">
                <div class="visualizer">
                  <label>
                    <input type="radio" name="visualizer" value="desktop" checked>
                    🖥️ Desktop
                  </label>
                  <label>
                    <input type="radio" name="visualizer" value="mobile">
                    📱 Mobile
                  </label>
                </div>
              </div>
            </div>
            
            <div class="mt-10">
              <button onclick="generatePreview()" class="generate-button">生成预览</button>
            </div>
          </div>
          
          <div class="main-content">
            <div class="preview-area">
              <div class="preview-container">
                <img id="preview" class="preview-frame" src="" alt="预览">
              </div>
              
              <div class="tabs">
                <div class="tab active" onclick="switchTab('templates')">Premium Templates</div>
                <div class="tab" onclick="switchTab('unsplash')">Images from Unsplash</div>
                <div class="tab" onclick="switchTab('patterns')">Patterns</div>
                <div class="tab" onclick="switchTab('colors')">Colors</div>
              </div>
              
              <div id="templates" class="tab-content active">
                <div class="grid">
                  <div class="template-card" onclick="applyTemplate('bubble', '#ed6ea0', '#ec8c69', '')">
                    <img src="/?content=BUBBLE&bgcolor=%23ed6ea0,%23ec8c69&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="applyTemplate('sweet', '#5c6bc0', '#8e99f3', '')">
                    <img src="/?content=SWEET%20STUFF&bgcolor=%235c6bc0,%238e99f3&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="applyTemplate('stripes', '#ffd54f', '#ffecb3', 'grid')">
                    <img src="/?content=STRIPES&bgcolor=%23ffd54f,%23ffecb3&textcolor=%23FFFFFF&pattern=grid" width="100%">
                  </div>
                  <div class="template-card" onclick="applyTemplate('punk', '#212121', '#484848', '')">
                    <img src="/?content=PUNK&bgcolor=%23212121,%23484848&textcolor=%23FFFFFF" width="100%">
                  </div>
                </div>
              </div>
              
              <div id="unsplash" class="tab-content">
                <div class="grid">
                  <div class="template-card" onclick="setBackground('picsum', '', '237')">
                    <img src="/?content=&bgcolor=%23333&textcolor=%23FFFFFF&bgservice=picsum&bgid=237" width="100%">
                  </div>
                  <div class="template-card" onclick="setBackground('picsum', '', '301')">
                    <img src="/?content=&bgcolor=%23333&textcolor=%23FFFFFF&bgservice=picsum&bgid=301" width="100%">
                  </div>
                  <div class="template-card" onclick="setBackground('picsum', '', '535')">
                    <img src="/?content=&bgcolor=%23333&textcolor=%23FFFFFF&bgservice=picsum&bgid=535" width="100%">
                  </div>
                  <div class="template-card" onclick="setBackground('picsum', '', '660')">
                    <img src="/?content=&bgcolor=%23333&textcolor=%23FFFFFF&bgservice=picsum&bgid=660" width="100%">
                  </div>
                </div>
              </div>
              
              <div id="patterns" class="tab-content">
                <div class="grid">
                  <div class="template-card" onclick="setPattern('grid')">
                    <img src="/?content=&bgcolor=%23ed6ea0,%23ec8c69&textcolor=%23FFFFFF&pattern=grid" width="100%">
                  </div>
                  <div class="template-card" onclick="setPattern('dots')">
                    <img src="/?content=&bgcolor=%23ed6ea0,%23ec8c69&textcolor=%23FFFFFF&pattern=dots" width="100%">
                  </div>
                  <div class="template-card" onclick="setPattern('diagonal')">
                    <img src="/?content=&bgcolor=%23ed6ea0,%23ec8c69&textcolor=%23FFFFFF&pattern=diagonal" width="100%">
                  </div>
                  <div class="template-card" onclick="setPattern('waves')">
                    <img src="/?content=&bgcolor=%23ed6ea0,%23ec8c69&textcolor=%23FFFFFF&pattern=waves" width="100%">
                  </div>
                  <div class="template-card" onclick="setPattern('hexagons')">
                    <img src="/?content=&bgcolor=%23ed6ea0,%23ec8c69&textcolor=%23FFFFFF&pattern=hexagons" width="100%">
                  </div>
                </div>
              </div>
              
              <div id="colors" class="tab-content">
                <div class="grid">
                  <div class="template-card" onclick="setColors('#ec407a', '#f48fb1')">
                    <img src="/?content=&bgcolor=%23ec407a,%23f48fb1&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="setColors('#7e57c2', '#b39ddb')">
                    <img src="/?content=&bgcolor=%237e57c2,%23b39ddb&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="setColors('#26a69a', '#80cbc4')">
                    <img src="/?content=&bgcolor=%2326a69a,%2380cbc4&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="setColors('#ff7043', '#ffab91')">
                    <img src="/?content=&bgcolor=%23ff7043,%23ffab91&textcolor=%23FFFFFF" width="100%">
                  </div>
                  <div class="template-card" onclick="setColors('#fff176', '#d4e157')">
                    <img src="/?content=&bgcolor=%23fff176,%23d4e157&textcolor=%23000000" width="100%">
                  </div>
                  <div class="template-card" onclick="setColors('#212121', '#484848')">
                    <img src="/?content=&bgcolor=%23212121,%23484848&textcolor=%23FFFFFF" width="100%">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bottom-options">
              <div class="bottom-tabs">
                <div class="bottom-tab active" onclick="switchBottomTab('bg-colors')">背景颜色</div>
                <div class="bottom-tab" onclick="switchBottomTab('bg-pattern')">背景图案</div>
                <div class="bottom-tab" onclick="switchBottomTab('bg-image')">背景图片</div>
              </div>
              
              <div id="bg-colors" class="bottom-content active">
                <div class="form-group">
                  <label for="bgcolor">背景颜色</label>
                  <div class="flex-row">
                    <div class="color-picker">
                      <div class="color-input">
                        <input type="color" id="bgcolor" value="#ed6ea0">
                      </div>
                    </div>
                    <input type="text" id="bgcolor-hex" placeholder="#ed6ea0 或 pink" value="#ed6ea0">
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="bgcolor2">渐变颜色 (可选)</label>
                  <div class="flex-row">
                    <div class="color-picker">
                      <div class="color-input">
                        <input type="color" id="bgcolor2" value="#ec8c69">
                      </div>
                    </div>
                    <input type="text" id="bgcolor2-hex" placeholder="#ec8c69 或留空" value="#ec8c69">
                  </div>
                </div>
              </div>
              
              <div id="bg-pattern" class="bottom-content">
                <div class="form-group">
                  <label for="pattern">背景图案</label>
                  <select id="pattern">
                    <option value="">无图案</option>
                    <option value="grid">网格</option>
                    <option value="dots">圆点</option>
                    <option value="diagonal">对角线</option>
                    <option value="waves">波浪</option>
                    <option value="hexagons">六边形</option>
                  </select>
                </div>
              </div>
              
              <div id="bg-image" class="bottom-content">
                <div class="form-group">
                  <label for="bgservice">背景图服务</label>
                  <select id="bgservice">
                    <option value="picsum">Picsum Photos</option>
                    <option value="pixabay">Pixabay</option>
                    <option value="pexels">Pexels</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="bg">背景关键词</label>
                  <input type="text" id="bg" placeholder="例如: nature, office">
                </div>
                
                <div class="form-group">
                  <label for="bgid">Picsum 图片 ID (可选)</label>
                  <input type="text" id="bgid" placeholder="留空则随机获取">
                  <div class="mt-10" style="font-size: 12px; color: #666;">
                    访问 <a href="https://picsum.photos/" target="_blank">https://picsum.photos/</a> 获取图片 ID
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div>
            Feedback or Suggestions? <a href="https://github.com/yourusername/notion-cover-generator" target="_blank">GitHub</a>
          </div>
          <div>
            <input type="text" id="image-url" readonly style="width: 400px;">
            <button onclick="copyImageUrl()" class="btn-secondary">复制链接</button>
          </div>
        </div>
      </div>
      
      <script>
        // 切换折叠面板
        function toggleAccordion(id) {
          const content = document.getElementById(id);
          content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
        
        // 切换标签页
        function switchTab(tabId) {
          // 隐藏所有标签内容
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });
          
          // 取消所有标签按钮的活动状态
          document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // 显示选定的标签内容
          document.getElementById(tabId).classList.add('active');
          
          // 激活对应的标签按钮
          const tabButtons = document.querySelectorAll('.tab');
          for (let i = 0; i < tabButtons.length; i++) {
            if (tabButtons[i].textContent.toLowerCase().includes(tabId.toLowerCase())) {
              tabButtons[i].classList.add('active');
              break;
            }
          }
        }
        
        // 切换底部标签页
        function switchBottomTab(tabId) {
          // 隐藏所有底部标签内容
          document.querySelectorAll('.bottom-content').forEach(content => {
            content.classList.remove('active');
          });
          
          // 取消所有底部标签按钮的活动状态
          document.querySelectorAll('.bottom-tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // 显示选定的底部标签内容
          document.getElementById(tabId).classList.add('active');
          
          // 激活对应的底部标签按钮
          const tabButtons = document.querySelectorAll('.bottom-tab');
          for (let i = 0; i < tabButtons.length; i++) {
            if (tabButtons[i].textContent.toLowerCase().includes(tabId.split('-').pop().toLowerCase())) {
              tabButtons[i].classList.add('active');
              break;
            }
          }
        }
        
        // 设置图标
        function setIcon(prefix, name) {
          document.getElementById('iconprefix').value = prefix;
          document.getElementById('iconname').value = name;
          generatePreview();
        }
        
        // 设置背景
        function setBackground(service, keyword, id) {
          document.getElementById('bgservice').value = service;
          document.getElementById('bg').value = keyword || '';
          document.getElementById('bgid').value = id || '';
          switchBottomTab('bg-image');
          generatePreview();
        }
        
        // 设置图案
        function setPattern(pattern) {
          document.getElementById('pattern').value = pattern;
          switchBottomTab('bg-pattern');
          generatePreview();
        }
        
        // 设置颜色
        function setColors(color1, color2) {
          document.getElementById('bgcolor').value = color1;
          document.getElementById('bgcolor-hex').value = color1;
          
          if (color2) {
            document.getElementById('bgcolor2').value = color2;
            document.getElementById('bgcolor2-hex').value = color2;
          } else {
            document.getElementById('bgcolor2').value = '';
            document.getElementById('bgcolor2-hex').value = '';
          }
          
          switchBottomTab('bg-colors');
          generatePreview();
        }
        
        // 应用模板
        function applyTemplate(text, color1, color2, pattern) {
          document.getElementById('content').value = text.toUpperCase();
          document.getElementById('bgcolor').value = color1;
          document.getElementById('bgcolor-hex').value = color1;
          
          if (color2) {
            document.getElementById('bgcolor2').value = color2;
            document.getElementById('bgcolor2-hex').value = color2;
          } else {
            document.getElementById('bgcolor2').value = '';
            document.getElementById('bgcolor2-hex').value = '';
          }
          
          document.getElementById('pattern').value = pattern || '';
          
          if (pattern) {
            switchBottomTab('bg-pattern');
          } else {
            switchBottomTab('bg-colors');
          }
          
          generatePreview();
        }
        
        // 生成预览
        function generatePreview() {
          const iconprefix = document.getElementById('iconprefix').value;
          const iconname = document.getElementById('iconname').value;
          const content = document.getElementById('content').value || '示例页面';
          const textSize = document.getElementById('text-size').value || '72';
          const font = document.getElementById('font').value || 'Inter';
          
          // 获取颜色值
          const bgcolorHex = document.getElementById('bgcolor-hex').value || '#ed6ea0';
          const bgcolor2Hex = document.getElementById('bgcolor2-hex').value || '';
          const bgcolor = bgcolor2Hex ? bgcolorHex + ',' + bgcolor2Hex : bgcolorHex;
          
          const textcolorHex = document.getElementById('textcolor-hex').value || '#FFFFFF';
          let iconcolorHex = document.getElementById('iconcolor-hex').value || '';
          
          // 如果勾选了"使用文本颜色"且图标颜色为空，则使用文本颜色
          const useTextColor = document.getElementById('use-text-color').checked;
          if (useTextColor && !iconcolorHex) {
            iconcolorHex = textcolorHex;
          }
          
          const iconsize = document.getElementById('iconsize').value || '100';
          const bg = document.getElementById('bg').value || '';
          const bgservice = document.getElementById('bgservice').value || 'picsum';
          const bgid = document.getElementById('bgid').value || '';
          const pattern = document.getElementById('pattern').value || '';
          
          // 构建参数
          let params = [];
          
          if (iconprefix && iconname) {
            params.push('iconprefix=' + encodeURIComponent(iconprefix));
            params.push('iconname=' + encodeURIComponent(iconname));
          }
          
          params.push('content=' + encodeURIComponent(content));
          params.push('bgcolor=' + encodeURIComponent(bgcolor));
          params.push('textcolor=' + encodeURIComponent(textcolorHex));
          params.push('iconsize=' + iconsize);
          
          if (iconcolorHex) {
            params.push('iconcolor=' + encodeURIComponent(iconcolorHex));
          }
          
          if (pattern) {
            params.push('pattern=' + encodeURIComponent(pattern));
          }
          
          if (bg || bgid) {
            if (bg) params.push('bg=' + encodeURIComponent(bg));
            if (bgid) params.push('bgid=' + encodeURIComponent(bgid));
            params.push('bgservice=' + encodeURIComponent(bgservice));
          }
          
          // 添加字体和大小参数 (在后端需要支持)
          params.push('font=' + encodeURIComponent(font));
          params.push('text_size=' + encodeURIComponent(textSize));
          
          // 获取可视化器设置
          const visualizer = document.querySelector('input[name="visualizer"]:checked').value;
          if (visualizer === 'mobile') {
            params.push('view=mobile');
          }
          
          const url = '/?' + params.join('&');
          document.getElementById('preview').src = url;
          document.getElementById('image-url').value = window.location.origin + url;
          
          // 更新下载按钮
          const downloadBtn = document.getElementById('download-btn');
          downloadBtn.onclick = function() {
            downloadSVG(url);
          };
        }
        
        // 复制图片 URL
        function copyImageUrl() {
          const urlInput = document.getElementById('image-url');
          urlInput.select();
          document.execCommand('copy');
          alert('URL 已复制到剪贴板!');
        }
        
        // 下载 SVG
        function downloadSVG(url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = 'notion-cover.svg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        
        // 颜色选择器与文本框同步
        document.getElementById('bgcolor').addEventListener('input', function() {
          document.getElementById('bgcolor-hex').value = this.value;
        });
        
        document.getElementById('bgcolor-hex').addEventListener('input', function() {
          document.getElementById('bgcolor').value = this.value;
        });
        
        document.getElementById('bgcolor2').addEventListener('input', function() {
          document.getElementById('bgcolor2-hex').value = this.value;
        });
        
        document.getElementById('bgcolor2-hex').addEventListener('input', function() {
          document.getElementById('bgcolor2').value = this.value;
        });
        
        document.getElementById('textcolor').addEventListener('input', function() {
          document.getElementById('textcolor-hex').value = this.value;
        });
        
        document.getElementById('textcolor-hex').addEventListener('input', function() {
          document.getElementById('textcolor').value = this.value;
        });
        
        document.getElementById('iconcolor').addEventListener('input', function() {
          document.getElementById('iconcolor-hex').value = this.value;
        });
        
        document.getElementById('iconcolor-hex').addEventListener('input', function() {
          document.getElementById('iconcolor').value = this.value;
        });
        
        // 页面加载时展开所有面板
        window.onload = function() {
          document.querySelectorAll('.accordion-content').forEach(content => {
            content.style.display = 'block';
          });
          
          // 生成初始预览
          generatePreview();
        };
      </script>
    </body>
    </html>
  `);
});

// 启动服务器
app.listen(port, () => {
  console.log(`Notion Cover Generator 服务已启动，端口: ${port}`);
  console.log(`- 生成封面: http://localhost:${port}/`);
  console.log(`- 帮助页面: http://localhost:${port}/info`);
});