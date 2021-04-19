const chartOptions = {
	spanGaps: true,
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: {
			align: 'start',
			labels: {
				padding: 16,
				color: 'rgba(255, 255, 255, 0.6)',
				usePointStyle: true,
				font: {
					size: 12,
					family: "'Inter', sans-serif",
				},
				filter: function (item, chart) {
					// Logic to remove a particular legend item goes here
					return !item.text.includes('hideme')
				},
			},
		},
	},
}

export default chartOptions
