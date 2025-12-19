import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function startStreamerTour() {
    const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        doneBtnText: '开始使用',
        nextBtnText: '下一步',
        prevBtnText: '上一步',
        steps: [
            {
                element: '#streamer-mode-container',
                popover: {
                    title: '欢迎来到主播模式 / 沉浸模式',
                    description: '这是一个专为直播和录屏设计的纯净界面。<br>您可以自由拖拽角色、缩放画布，轻松完成排表。',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '#streamer-canvas-area',
                popover: {
                    title: '1. 排表画布 (Center)',
                    description: '将角色从任何地方<b>拖拽</b>到格子中即可填入。<br>再次拖拽格子里的角色可以调整位置。',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#streamer-dock',
                popover: {
                    title: '2. 角色卡池 (Right)',
                    description: '您搜索和上传的角色都会出现在右侧。<br><b>长按</b>或<b>右键</b>角色卡片可以进入“删除模式”。',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '#dock-add-btn',
                popover: {
                    title: '3. 添加角色',
                    description: '点击这里搜索新角色，或者上传您本地的图片。',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#dock-trash',
                popover: {
                    title: '4. 删除与清空',
                    description: '将角色<b>拖拽到这里</b>即可删除。<br>点击该按钮可清空整个暂存区。',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#streamer-toolbar',
                popover: {
                    title: '5. 左侧工具栏 (Left)',
                    description: '这里集合了撤销、重做、全屏和保存功能。<br>不使用时可以将其收起，享受最大化视野。',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#dock-tool-toggle',
                popover: {
                    title: '工具栏开关',
                    description: '控制左侧悬浮工具栏的展开与折叠。',
                    side: "top", // Adjusted for bottom position of button on mobile or desktop layout dependent
                    align: 'center'
                }
            },
            {
                element: '#zoom-controls',
                popover: {
                    title: '6. 视野控制 (Bottom)',
                    description: '位于底部居中，方便随时缩放画布。<br>点击<b>问号</b>可再次查看此教程。',
                    side: "top",
                    align: 'center'
                }
            }
        ]
    })

    driverObj.drive()
}
