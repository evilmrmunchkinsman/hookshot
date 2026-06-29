const prisma= require('../config/db')

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.userId

        const deliveryLogs = await prisma.deliveryLog.findMany({
            where: {
                event: {
                    userId: userId
                }
            },
            include: {
                event: {
                    select: {
                        type: true,
                        endpointId: true
                    }
                }
            }
        })

        
        const total = deliveryLogs.length
        const successful = deliveryLogs.filter(log => log.status === 'success').length
        const failed = deliveryLogs.filter(log => log.status === 'failed').length

        const successRate = total > 0 ? (successful / total) * 100 : 0
        const failureRate = total > 0 ? (failed / total) * 100 : 0

        
        const byEndpoint = {}

        deliveryLogs.forEach(log => {
            const endpointId = log.event.endpointId

            if (!byEndpoint[endpointId]) {
                byEndpoint[endpointId] = {
                    endpointId: endpointId,
                    total: 0,
                    success: 0,
                    failed: 0,
                    totalLatency: 0,
                    count: 0
                }
            }

            byEndpoint[endpointId].total++

            if (log.status === 'success') {
                byEndpoint[endpointId].success++
            } else {
                byEndpoint[endpointId].failed++
            }

            if (log.responseCode) {
                byEndpoint[endpointId].totalLatency += log.responseCode
                byEndpoint[endpointId].count++
            }
        })

        const endpoints = Object.values(byEndpoint).map(e => ({
            endpointId: e.endpointId,
            total: e.total,
            success: e.success,
            failed: e.failed,
            avgLatency: e.count > 0 ? Math.round(e.totalLatency / e.count) : 0
        }))

        res.status(200).json({
            totalDeliveries: total,
            successRate: Math.round(successRate * 10) / 10,
            failureRate: Math.round(failureRate * 10) / 10,
            byEndpoint: endpoints
        })

    } catch (error) {
        console.error('Dashboard error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}
const getDeliveries = async (req, res) => {
    try {
        
        const { status, startDate, endDate, endpointId, page = 1, limit = 10 } = req.query
        const userId = req.user.userId

        
        const where = {
            event: {
                userId: userId
            }
        }

        if (status) {
            where.status = status
        }

        if (endpointId) {
            where.event.endpointId = parseInt(endpointId)
        }

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) {
                where.createdAt.gte = new Date(startDate)
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate)
            }
        }

      
        const total = await prisma.deliveryLog.count({ where })

        
        const deliveries = await prisma.deliveryLog.findMany({
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        type: true,
                        payload: true,
                        endpointId: true,
                        endpoint: {
                            select: {
                                url: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        })
							res.status(200).json({
            deliveries,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        })

    } catch (error) {
        console.error('Get deliveries error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { getDashboard, getDeliveries }