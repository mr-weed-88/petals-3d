import React from 'react'

const ToolButton = (props) => {
    const { icon, condition } = props

    return (
        <>
            <button
                className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold ${
                    condition ? 'bg-[#5CA367]' : 'hover:bg-[#5CA367]/25'
                }`}
            >
                {icon}
            </button>
        </>
    )
}

export default ToolButton
