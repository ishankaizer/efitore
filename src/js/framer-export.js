export function generateFramerComponent(project, html, projectJSON) {
  const isMedia = project.kind === 'media'
  const config = { ...project, ...(isMedia ? { media: '' } : {}) }
  const template = html.replace(projectJSON, '__FORM_STUDIO_PROJECT__')
  return `// Form Studio: paste the complete file into a Framer Code Component.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const sceneTemplate = ${JSON.stringify(template)}
const preset = ${JSON.stringify(config)}

type Props = {
    style?: React.CSSProperties
    mediaType?: "image" | "video"
    image?: { src: string; alt?: string; srcSet?: string }
    video?: string
    showControls?: boolean
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 450
 */
export default function FormEffect(props: Props) {
    const { style, mediaType = "${project.type === 'video' ? 'video' : 'image'}", image, video, showControls = false } = props
    const media = mediaType === "video" ? video : image?.src
    const source = React.useMemo(() => {
        const config = { ...preset, ${isMedia ? 'media: media || "", type: mediaType' : ''} }
        const json = JSON.stringify(config).replace(/</g, "\\\\u003c")
        const document = sceneTemplate.replace("__FORM_STUDIO_PROJECT__", () => json)
        return showControls ? document : document.replace("</style>", "nav{display:none}</style>")
    }, [media, mediaType, showControls])
    if (${isMedia} && !media) {
        return <div style={{ width: "100%", height: "100%", minHeight: 120, background: "#181c25", color: "#d9e3ff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: "sans-serif", ...style }}>
            Select this component and upload an image or video in the right sidebar.
        </div>
    }
    return <iframe
        title={image?.alt || "Form Studio interactive effect"}
        srcDoc={source}
        sandbox="allow-scripts"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%", border: 0, display: "block", ...style }}
    />
}

addPropertyControls(FormEffect, {
    ${isMedia ? `mediaType: { type: ControlType.Enum, title: "Media", options: ["image", "video"], optionTitles: ["Image", "Video"], defaultValue: "${project.type === 'video' ? 'video' : 'image'}", displaySegmentedControl: true },
    image: { type: ControlType.ResponsiveImage, title: "Image", hidden: (props) => props.mediaType === "video" },
    video: { type: ControlType.File, title: "Video", allowedFileTypes: ["mp4", "webm"], hidden: (props) => props.mediaType !== "video" },` : ''}
    showControls: { type: ControlType.Boolean, title: "Playback controls", defaultValue: false },
})
`
}
