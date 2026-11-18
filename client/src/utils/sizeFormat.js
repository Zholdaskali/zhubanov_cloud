export default function sizeFormat(bytes = 0) {
    if (bytes < 1024) return `${bytes} Б`
    const units = ['КБ','МБ','ГБ','ТБ']
    let value = bytes / 1024, index = 0
    while (value >= 1024 && index < units.length - 1) {value /= 1024;index++}
    return `${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value)} ${units[index]}`
}
