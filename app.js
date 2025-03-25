const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

// 使用环境变量
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

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
      // 确保颜色格式正确（# 需转为 %23）
      const formattedColor = iconColor.startsWith('#') 
        ? iconColor.replace('#', '%23') 
        : iconColor;
      params.append('color', formattedColor);
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

// 生成图案背景
function generatePatternBackground(patternType = 'grid', colors) {
  let pattern = '';
  
  // 确保至少有一种颜色
  const mainColor = colors[0] || '#4F46E5';
  const secondColor = colors[1] || '#818CF8';
  
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
      // 默认彩色渐变
      return { 
        pattern: '', 
        fill: `linear-gradient(90deg, ${mainColor}, ${secondColor})`
      };
  }
}

// 根据参数创建SVG图片
async function generateSVG(params) {
  // 设置默认值
  const { 
    iconprefix, 
    iconname,
    content = '示例页面', 
    bgcolor = '#4F46E5', 
    textcolor = '#FFFFFF',
    iconcolor, // 可选的图标颜色，默认与文本颜色相同
    iconsize = '100', // 默认图标尺寸
    bg, // 背景图的关键词
    bgservice, // 背景服务提供商
    bgid, // 背景图的 ID
    pattern // 图案背景类型
  } = params;
  
  // 确定图标颜色 - 如果没有指定，则使用文本颜色
  const finalIconColor = iconcolor || textcolor;
  
  // 解析背景色和文本色
  const bgColors = bgcolor.split(',');
  const textColors = textcolor.split(',');
  
  // 创建背景渐变
  let backgroundFill = '';
  if (bgColors.length > 1) {
    backgroundFill = `<linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      ${bgColors.map((color, index) => 
        `<stop offset="${(index * 100) / (bgColors.length - 1)}%" stop-color="${color}" />`
      ).join('')}
    </linearGradient>`;
  }
  
  // 创建文本渐变
  let textFill = '';
  if (textColors.length > 1) {
    textFill = `<linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      ${textColors.map((color, index) => 
        `<stop offset="${(index * 100) / (textColors.length - 1)}%" stop-color="${color}" />`
      ).join('')}
    </linearGradient>`;
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
  
  // 计算文本宽度 (估算值，每个字符约 50px)
  const textWidth = content.length * 50;
  
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
      font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" 
      font-size="72" 
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
app.get('/info', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Notion Cover 生成器</title>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        label { display: block; margin: 10px 0 5px; }
        input, select { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .icon-group { display: flex; gap: 10px; }
        .icon-group input, .icon-group select { flex: 1; }
        button { background: #0070f3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .preview { margin-top: 20px; border: 1px solid #eee; max-width: 100%; }
        h1 { color: #333; }
        .tips { color: #666; font-size: 0.9em; margin-top: 5px; }
        .examples { margin-top: 20px; }
        .examples h3 { margin-bottom: 10px; }
        .example-list { display: flex; flex-wrap: wrap; gap: 10px; }
        .example-item { cursor: pointer; border: 1px solid #eee; padding: 8px; border-radius: 4px; }
        .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; margin-bottom: 10px; }
        .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 10px 16px; transition: 0.3s; }
        .tab button:hover { background-color: #ddd; }
        .tab button.active { background-color: #0070f3; color: white; }
        .tabcontent { display: none; padding: 6px 12px; border: 1px solid #ccc; border-top: none; }
        .open { display: block; }
      </style>
    </head>
    <body>
      <h1>Notion Cover 生成器</h1>
      
      <div class="tab">
        <button class="tablinks active" onclick="openTab(event, 'Basic')">基本设置</button>
        <button class="tablinks" onclick="openTab(event, 'Background')">背景设置</button>
        <button class="tablinks" onclick="openTab(event, 'Advanced')">高级设置</button>
      </div>
      
      <div id="Basic" class="tabcontent open">
        <div class="icon-group">
          <div style="flex: 1;">
            <label for="iconprefix">图标前缀:</label>
            <input type="text" id="iconprefix" placeholder="例如: mdi">
          </div>
          <div style="flex: 1;">
            <label for="iconname">图标名称:</label>
            <input type="text" id="iconname" placeholder="例如: camera">
          </div>
          <div style="flex: 0.5;">
            <label for="iconsize">图标尺寸:</label>
            <input type="number" id="iconsize" placeholder="图标尺寸" value="100">
          </div>
        </div>
        <div class="tips">前缀和名称组合使用，如 mdi + camera, bi + alarm, fluent-emoji-flat + alarm-clock</div>
        
        <label for="content">内容:</label>
        <input type="text" id="content" placeholder="页面标题" value="示例页面">
        
        <div class="icon-group">
          <div style="flex: 1;">
            <label for="textcolor">文字颜色:</label>
            <input type="text" id="textcolor" placeholder="单色或逗号分隔的多色" value="#FFFFFF">
          </div>
          <div style="flex: 1;">
            <label for="iconcolor">图标颜色 (可选):</label>
            <input type="text" id="iconcolor" placeholder="不填则使用文字颜色">
          </div>
        </div>
      </div>
      
      <div id="Background" class="tabcontent">
        <h3>背景颜色</h3>
        <label for="bgcolor">背景颜色:</label>
        <input type="text" id="bgcolor" placeholder="单色或逗号分隔的多色" value="#4F46E5">
        
        <h3>图案背景</h3>
        <div class="icon-group">
          <div style="flex: 1;">
            <label for="pattern">图案类型:</label>
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
        
        <h3>背景图片</h3>
        <div class="icon-group">
          <div style="flex: 1;">
            <label for="bgservice">背景图服务:</label>
            <select id="bgservice">
              <option value="picsum">Picsum Photos</option>
              <option value="pixabay">Pixabay</option>
              <option value="pexels">Pexels</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label for="bg">背景图关键词 (可选):</label>
            <input type="text" id="bg" placeholder="例如: nature, office">
          </div>
        </div>
        
        <div class="tips">优先级: 背景图 > 图案背景 > 背景颜色</div>
        
        <label for="bgid">Picsum 图片 ID (可选):</label>
        <input type="text" id="bgid" placeholder="留空则随机获取">
        <div class="tips">访问 <a href="https://picsum.photos/" target="_blank">https://picsum.photos/</a> 获取图片 ID</div>
      </div>
      
      <div id="Advanced" class="tabcontent">
        <p>目前没有高级选项，敬请期待...</p>
      </div>
      
      <button onclick="generatePreview()">生成预览</button>
      
      <div>
        <h3>预览:</h3>
        <img id="preview" class="preview" alt="预览将显示在这里">
      </div>
      
      <div style="margin-top: 20px;">
        <h3>链接:</h3>
        <input type="text" id="link" readonly>
      </div>
      
      <div class="examples">
        <h3>图标示例:</h3>
        <div class="example-list">
          <div class="example-item" onclick="setIcon('mdi', 'camera')">mdi/camera</div>
          <div class="example-item" onclick="setIcon('bi', 'book')">bi/book</div>
          <div class="example-item" onclick="setIcon('fluent-emoji-flat', 'alarm-clock')">fluent-emoji-flat/alarm-clock</div>
          <div class="example-item" onclick="setIcon('heroicons', 'code')">heroicons/code</div>
          <div class="example-item" onclick="setIcon('carbon', 'calendar')">carbon/calendar</div>
          <div class="example-item" onclick="setIcon('tabler', 'note')">tabler/note</div>
        </div>
      </div>
      
      <script>
        function openTab(evt, tabName) {
          var i, tabcontent, tablinks;
          
          // 隐藏所有标签内容
          tabcontent = document.getElementsByClassName("tabcontent");
          for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
          }
          
          // 取消所有按钮的 active 状态
          tablinks = document.getElementsByClassName("tablinks");
          for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
          }
          
          // 显示当前标签并设置按钮为 active
          document.getElementById(tabName).style.display = "block";
          evt.currentTarget.className += " active";
        }
        
        function generatePreview() {
          const iconprefix = document.getElementById('iconprefix').value;
          const iconname = document.getElementById('iconname').value;
          const iconsize = document.getElementById('iconsize').value || '100';
          const iconcolor = document.getElementById('iconcolor').value;
          const content = document.getElementById('content').value || '示例页面';
          const bgcolor = document.getElementById('bgcolor').value || '#4F46E5';
          const textcolor = document.getElementById('textcolor').value || '#FFFFFF';
          const bg = document.getElementById('bg').value;
          const bgservice = document.getElementById('bgservice').value;
          const bgid = document.getElementById('bgid').value;
          const pattern = document.getElementById('pattern').value;
          
          let params = [];
          
          if (iconprefix && iconname) {
            params.push('iconprefix=' + encodeURIComponent(iconprefix));
            params.push('iconname=' + encodeURIComponent(iconname));
          }
          
          params.push('content=' + encodeURIComponent(content));
          params.push('bgcolor=' + encodeURIComponent(bgcolor));
          params.push('textcolor=' + encodeURIComponent(textcolor));
          params.push('iconsize=' + iconsize);
          
          if (iconcolor) {
            params.push('iconcolor=' + encodeURIComponent(iconcolor));
          }
          
          if (pattern) {
            params.push('pattern=' + encodeURIComponent(pattern));
          }
          
          if (bg || bgid) {
            if (bg) params.push('bg=' + encodeURIComponent(bg));
            if (bgid) params.push('bgid=' + encodeURIComponent(bgid));
            params.push('bgservice=' + encodeURIComponent(bgservice));
          }
          
          const url = '/?' + params.join('&');
          document.getElementById('preview').src = url;
          
          const fullUrl = window.location.origin + url;
          document.getElementById('link').value = fullUrl;
        }
        
        function setIcon(prefix, name) {
          document.getElementById('iconprefix').value = prefix;
          document.getElementById('iconname').value = name;
          generatePreview();
        }
        
        // 页面加载时生成默认预览
        window.onload = function() {
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