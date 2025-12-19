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
                element: '#streamer-dock',
                popover: {
                    title: '角色卡池 (Dock)',
                    description: '您搜索和上传的角色都会出现在这里。<br><b>长按</b>或<b>右键</b>角色卡片可以进入“删除模式”。',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '#dock-add-btn',
                popover: {
                    title: '添加角色',
                    description: '点击这里搜索新角色，或者上传您本地的图片。',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#streamer-toolbar',
                popover: {
                    title: '悬浮工具栏 (Toolbar)',
                    description: '这里集合了撤销、重做、全屏和保存功能。<br>不使用时可以将其收起，享受最大化视野。',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#dock-tool-toggle',
                popover: {
                    title: '工具栏设置',
                    description: '点击这里可以<b>收起/展开</b>悬浮工具栏。',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#streamer-canvas-area',
                popover: {
                    title: '排表画布',
                    description: '将角色从右侧卡池直接<b>拖拽</b>到格子中即可填入。<br>再次拖拽格子里的角色可以调整位置。',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#zoom-controls',
                popover: {
                    title: '视野控制',
                    description: '如果格子太多看不全，可以用这里缩放视野。',
                    side: "top",
                    align: 'start'
                }
            }
        ]
    })

    driverObj.drive()
}
