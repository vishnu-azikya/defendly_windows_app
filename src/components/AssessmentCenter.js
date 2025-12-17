// AssessmentCenter.js
import ActionMenu from './ActionMenu';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Image,
	TouchableOpacity,
	Pressable,
	ActivityIndicator,
	Animated,
	Alert,
    Dimensions,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import useOrganization from '../hooks/useOrganization';
import useAuth from '../hooks/useAuth';
import scanService, { initiateScan, pollScanStatus, extractDomain, getScanById } from '../services/scanService';
import download from '../images/download.png';
import brain from '../images/brain.png';
import ScanModal from '../modal/scanModal';
import summary from '../images/summary.png';
import AdditionalMetrics from '../images/AdditionalMetrics.png';
import Vulnerabilities from '../images/Vulnerabilities.png';
import scanIcon from '../images/scanIcon.png';
import { downloadPdfReportFromApi } from '../utils/reportDownload';
import {
	buildSingleComprehensiveCsvReport,
	downloadComprehensiveCsvReport,
} from '../utils/csvReport';

const PAGE_SIZE = 10;
const WINDOW = Dimensions.get('window');
const MENU_WIDTH = 220; // px – width of dropdown menu

// Status Pill Component
const StatusPill = ({ status }) => {
	const normalized = String(status || '').toLowerCase();
	const isCompleted = normalized.includes('complete') || normalized === 'success';
	const bgColor = isCompleted ? '#ECFDF3' : '#FEF3C7';
	const textColor = isCompleted ? '#059669' : '#92400E';
	return (
		<View style={[styles.statusPill, { backgroundColor: bgColor }]}>
			<Text style={[styles.statusText, { color: textColor }]}>{status || '—'}</Text>
		</View>
	);
};

// ActionMenu is now imported and used in Row component

// Donut Chart Component for Vulnerabilities
const DonutChart = ({ data, total }) => {
	debugger;
	if (total === 0) {
		return (
			<View style={styles.donutChartEmpty}>
				<Text style={styles.donutEmptyText}>No data</Text>
			</View>
		);
	}

	const radius = 80;
	const strokeWidth = 16;
	const normalizedRadius = radius - strokeWidth * 2;
	const circumference = normalizedRadius * 2 * Math.PI;
	const size = radius * 2;

	// Filter out zero values first
	const filteredData = data.filter(item => item.value > 0);
	
	if (filteredData.length === 0) {
		return (
			<View style={styles.donutChartEmpty}>
				<Text style={styles.donutEmptyText}>No data</Text>
			</View>
		);
	}

	// Calculate total from filtered data to ensure segments fill exactly 100%
	const filteredTotal = filteredData.reduce((sum, item) => sum + item.value, 0);

	let cumulativePercentage = 0;
	debugger
	return (
		<View style={styles.donutContainer}>
			<Svg width={size} height={size} style={styles.donutSvg}>
				{/* Segments - only show non-zero values, rotate -90 degrees */}
				<G transform={`translate(${radius}, ${radius}) rotate(-90)`}>
					{filteredData.map((item, index) => {
						// Calculate percentage based on filtered total so it adds up to 100%
						const isLast = index === filteredData.length - 1;
						// For the last segment, ensure it fills exactly to 100%
						const percentage = isLast 
							? 100 - cumulativePercentage 
							: (item.value / filteredTotal) * 100;
						
						const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
						const strokeDashoffset = -cumulativePercentage * (circumference / 100);

						cumulativePercentage += percentage;

						return (
							<Circle
								key={index}
								stroke={item.color}
								fill="transparent"
								strokeWidth={strokeWidth}
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								r={normalizedRadius}
								cx={0}
								cy={0}
							/>
						);
					})}
				</G>
			</Svg>
			
			{/* Total Count in center */}
			<View style={styles.donutCenter}>
				<Text style={styles.donutTotal}>{total}</Text>
			</View>
		</View>
	);
};

// Metric Card Component
const MetricCard = ({ label, value, unit }) => (
	<View style={styles.metricCard}>
		<View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }]}>
			<Image source={scanIcon} style={[{ width: 12, height: 12 }]} />
			<Text style={styles.metricLabel}>{label}</Text>
		</View>
		<Text style={styles.metricValue}>
			{value}
			{unit && <Text style={styles.metricUnit}> {unit}</Text>}
		</Text>
	</View>
);

// Vulnerability Severity Box
const SeverityBox = ({ label, count, color }) => {
	// Convert hex color to rgba with 50% opacity for border
	const hexToRgba = (hex, alpha) => {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	};
	
	const borderColor = hexToRgba(color, 0.5);
	
	return (
		<View style={[styles.severityBox, { borderColor }]}>
			<Text style={styles.severityLabel}>{label}</Text>
			<Text style={[styles.severityCount, { color }]}>{count}</Text>
		</View>
	);
};

// Calculate scan duration
const calculateDuration = (startTime, endTime, scan) => {
	console.log('Duration calculation:', { startTime, endTime, scan: scan?.id });

	if (!startTime || !endTime || startTime === '—' || endTime === '—') {
		console.log('Missing start or end time');
		return '—';
	}

	try {
		// Try multiple date parsing approaches
		let start, end;

		// Approach 1: Direct parsing
		start = new Date(startTime);
		end = new Date(endTime);

		// Approach 2: If direct parsing fails, try with T separator
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			start = new Date(startTime.replace(' ', 'T'));
			end = new Date(endTime.replace(' ', 'T'));
		}

		// Approach 3: If still failing, try parsing from original scan data
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			const originalScan = scan?.originalScan || scan;
			if (originalScan?.createdAt && originalScan?.updatedAt) {
				start = new Date(originalScan.createdAt);
				end = new Date(originalScan.updatedAt);
			} else if (originalScan?.scan_date && originalScan?.updatedAt) {
				start = new Date(originalScan.scan_date);
				end = new Date(originalScan.updatedAt);
			} else if (scan?.createdAt && scan?.updatedAt) {
				start = new Date(scan.createdAt);
				end = new Date(scan.updatedAt);
			}
		}

		console.log('Parsed dates:', { start: start.toISOString(), end: end.toISOString() });

		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			console.log('Failed to parse dates');
			return '—';
		}

		const diffMs = end.getTime() - start.getTime();
		const diffMins = Math.round(diffMs / (1000 * 60));

		console.log('Duration calculated:', diffMins, 'minutes');

		if (diffMins < 1) {
			return '<1m';
		} else if (diffMins < 60) {
			return `${diffMins}m`;
		}

		const hours = Math.floor(diffMins / 60);
		const mins = diffMins % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	} catch (error) {
		console.log('Duration calculation error:', error);
		return '—';
	}
};

const isScanCompleted = (scan) => {
    const normalized = String(scan?.status || "").toLowerCase().trim();
    return (
        normalized.includes("complete") ||
        normalized === "success" ||
        normalized === "finished"
    );
};

// Expanded Row Details Component
const ExpandedRowDetails = ({ scan, originalItem, loading = false }) => {
	// Show loading state while fetching detailed data
	if (loading) {
		return (
			<View style={[styles.expandedDetails, { padding: 20, alignItems: 'center', justifyContent: 'center' }]}>
				<ActivityIndicator size="small" color="#3b82f6" />
				<Text style={{ marginTop: 10, color: '#6b7280' }}>Loading scan details...</Text>
			</View>
		);
	}

	// Use detailed scan data if available, otherwise fallback to basic scan data
	// Merge both to ensure we have all available data
	const detailedScan = scan || {};
	
	// Log the detailed scan structure for debugging
	console.log('ExpandedRowDetails - detailedScan structure:', JSON.stringify(detailedScan, null, 2).substring(0, 1000));
	console.log('ExpandedRowDetails - scan prop keys:', scan ? Object.keys(scan).join(', ') : 'null');
	
	// Extract severity data from various possible locations in the API response
	// Try multiple possible paths where severity data might be stored
	const severity = 
		detailedScan.severity || 
		detailedScan.details?.severity || 
		detailedScan.vulnerabilities?.severity ||
		detailedScan.alerts?.severity ||
		{};
	
	// Extract vulnerability counts - try multiple possible locations
	const vulnerabilities = 
		detailedScan.vulnerabilities || 
		detailedScan.details?.vulnerabilities || 
		detailedScan.total_vulnerabilities ||
		detailedScan.vulnerability_count ||
		(Array.isArray(detailedScan.alerts) ? detailedScan.alerts.length : 0) ||
		0;
	
	// Extract severity counts with fallbacks
	const criticalCount = severity.critical || severity.Critical || 0;
	const highCount = severity.high || severity.High || 0;
	const mediumCount = severity.medium || severity.Medium || 0;
	const lowCount = severity.low || severity.Low || 0;
	const infoCount = severity.info || severity.Info || 0;
	
	// If severity is empty but we have alerts, calculate from alerts
	let calculatedSeverity = { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount, info: infoCount };
	if (Array.isArray(detailedScan.alerts) && detailedScan.alerts.length > 0 && !criticalCount && !highCount && !mediumCount && !lowCount) {
		// Calculate severity from alerts array
		calculatedSeverity = {
			critical: detailedScan.alerts.filter(a => a?.riskcode === '4' || a?.severity === 'critical' || a?.severity === 'Critical').length,
			high: detailedScan.alerts.filter(a => a?.riskcode === '3' || a?.severity === 'high' || a?.severity === 'High').length,
			medium: detailedScan.alerts.filter(a => a?.riskcode === '2' || a?.severity === 'medium' || a?.severity === 'Medium').length,
			low: detailedScan.alerts.filter(a => a?.riskcode === '1' || a?.severity === 'low' || a?.severity === 'Low').length,
			info: detailedScan.alerts.filter(a => a?.riskcode === '0' || a?.severity === 'info' || a?.severity === 'Info').length,
		};
	}
	
	const chartData = [
		{ label: "Critical", value: calculatedSeverity.critical || 0, color: "#7f1d1d" },
		{ label: "High", value: calculatedSeverity.high || 0, color: "#dc2626" },
		{ label: "Medium", value: calculatedSeverity.medium || 0, color: "#fbbf24" },
		{ label: "Low", value: calculatedSeverity.low || 0, color: "#16a34a" },
		{ label: "Info", value: calculatedSeverity.info || 0, color: "#0ea5e9" },
	];

	const totalVulnerabilities = vulnerabilities;
	
	// Extract organization with multiple fallbacks
	// The scan prop is: expandedScanDetails[item.id] || item
	// - If detailed scan exists: it's the API response (might have organization as object)
	// - If not: it's the item from mapApiScanToRow (has organization as string already)
	
	// First, check if we have the detailed scan (from API) - it might have organization as object
	let orgFromDetailed = null;
	if (detailedScan && Object.keys(detailedScan).length > 0) {
		orgFromDetailed = 
			(typeof detailedScan.organization === 'string' && detailedScan.organization !== '—' ? detailedScan.organization : null) ||
			detailedScan.organization?.name ||
			detailedScan.organizationName ||
			detailedScan.org?.name ||
			detailedScan.orgName ||
			detailedScan.tenant?.name ||
			detailedScan.tenantName ||
			detailedScan.project?.organization ||
			detailedScan.project?.organizationName;
	}
	
	// Then check the original item (from mapApiScanToRow) - organization is already a string
	// This is likely where the organization name is stored!
	// Check both scan (which might be the detailed scan) and originalItem (which is the mapped item)
	const orgFromItem = 
		(scan?.organization && scan.organization !== '—' && typeof scan.organization === 'string' ? scan.organization : null) ||
		(scan?.organizationName && scan.organizationName !== '—' ? scan.organizationName : null) ||
		(originalItem?.organization && originalItem.organization !== '—' && typeof originalItem.organization === 'string' ? originalItem.organization : null) ||
		(originalItem?.organizationName && originalItem.organizationName !== '—' ? originalItem.organizationName : null);
	
	const organization = orgFromDetailed || orgFromItem || '—';
	
	console.log('Organization extraction:', {
		'orgFromDetailed': orgFromDetailed,
		'orgFromItem': orgFromItem,
		'final result': organization,
		'scan.organization': scan?.organization,
		'originalItem.organization': originalItem?.organization,
		'detailedScan.organization': detailedScan.organization,
	});
	
	// Extract scan target with multiple fallbacks
	const scanTarget = 
		detailedScan.scanTarget || 
		detailedScan.url || 
		detailedScan.target || 
		detailedScan.asset ||
		detailedScan.scan_target ||
		'—';
	
	// Extract start and end times with multiple fallbacks
	const startTime = 
		detailedScan.scanStart || 
		detailedScan.startTime || 
		detailedScan.scan_date ||
		detailedScan.createdAt ||
		detailedScan.start_date;
	
	const endTime = 
		detailedScan.scanEnd || 
		detailedScan.endTime || 
		detailedScan.updatedAt ||
		detailedScan.end_date;
	
	const duration = calculateDuration(startTime, endTime, detailedScan);
	return (
		<View style={styles.expandedDetails}>
			{/* Three Column Layout */}
			<View style={styles.threeColumnLayout}>

				{/* Column 1: Scan Summary */}
				<View style={styles.column}>
					<View style={styles.detailSection}>
						<View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center' }]}>
							<View style={[{ width: 40, height: 40, borderWidth: 1, borderColor: '#e5e7eb', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginRight: 8 }]}>
								<Image source={summary} style={[{ width: 20, height: 20 }]} />
							</View>
							<View>
								<Text style={styles.sectionTitle}>Scan Summary</Text>
								<Text style={styles.sectionSubtitle}>Assessment information</Text>
							</View>
						</View>

						{/* Scan Target - Full Width */}
						<View style={styles.fullWidthMetric}>
							<Text style={styles.metricLabel}>Scan Target</Text>
							<Text style={styles.metricValue} numberOfLines={2} ellipsizeMode="tail">
								{scanTarget}
							</Text>
						</View>

						{/* Grid Layout for other metrics */}
						<View style={styles.summaryGrid}>
							<MetricCard label="Scan Type" value={detailedScan.type || detailedScan.scanType || 'AI Scan'} />
							<MetricCard label="Auth Scan" value={detailedScan.authScan || detailedScan.auth_scan ? 'Yes' : 'No'} />
						</View>

						<View style={styles.summaryGrid}>
							<MetricCard label="Organization" value={organization} />
							<MetricCard label="Duration" value={duration} />
						</View>
					</View>
				</View>

				{/* Column 2: Vulnerabilities */}
				<View style={styles.column}>
					<View style={styles.detailSection}>
						<View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center' }]}>
							<View style={[{ width: 40, height: 40, borderWidth: 1, borderColor: '#e5e7eb', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginRight: 8 }]}>
								<Image source={Vulnerabilities} style={[{ width: 20, height: 20 }]} />
							</View>
							<View>
								<Text style={styles.sectionTitle}>Vulnerabilities</Text>
								<Text style={styles.sectionSubtitle}>Security issues found</Text>
							</View>
						</View>

						<View style={styles.vulnerabilitiesContainer}>
							<View style={styles.severityGridCompact}>
								{/* Row 1: Critical and High - Always show Critical even if 0 */}
								<View style={styles.severityRow}>
									<SeverityBox
										label="Critical"
										count={calculatedSeverity.critical || 0}
										color="#7f1d1d"
									/>
									<SeverityBox
										label="High"
										count={calculatedSeverity.high || 0}
										color="#dc2626"
									/>
								</View>

								{/* Row 2: Medium and Low */}
								<View style={styles.severityRow}>
									<SeverityBox
										label="Medium"
										count={calculatedSeverity.medium || 0}
										color="#fbbf24"
									/>
									<SeverityBox
										label="Low"
										count={calculatedSeverity.low || 0}
										color="#16a34a"
									/>
								</View>

								{/* Row 3: Info (if exists) */}
								{calculatedSeverity.info > 0 && (
									<View style={styles.severityRow}>
										<SeverityBox
											label="Info"
											count={calculatedSeverity.info}
											color="#0ea5e9"
										/>
										<View style={styles.severityBoxPlaceholder} />
									</View>
								)}
							</View>

							<DonutChart data={chartData} total={totalVulnerabilities} />
						</View>
					</View>
				</View>

				{/* Column 3: Additional Metrics */}
				<View style={styles.column}>
					<View style={styles.detailSection}>
						<View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center' }]}>
							<View style={[{ width: 40, height: 40, borderWidth: 1, borderColor: '#e5e7eb', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginRight: 8 }]}>
								<Image source={AdditionalMetrics} style={[{ width: 20, height: 20 }]} />
							</View>
							<View>
								<Text style={styles.sectionTitle}>Additional Metrics</Text>
								<Text style={styles.sectionSubtitle}>Risk and compliance scores</Text>
							</View>
						</View>
						<ScrollView horizontal={false} style={{ maxHeight: 230, paddingEnd: 8 }} showsHorizontalScrollIndicator={false}>
							<View style={styles.metricsGridCompact}>
								<MetricCard
									label="Cyber Hygiene"
									value={detailedScan.details?.cyber_hygiene_score?.score || detailedScan.cyber_hygiene_score?.score || '—'}
									unit={detailedScan.details?.cyber_hygiene_score?.grade || detailedScan.cyber_hygiene_score?.grade || ''}
								/>
								<MetricCard
									label="Threat Intel"
									value={detailedScan.details?.threat_intelligence?.threat_intelligence_score?.score || detailedScan.threat_intelligence?.threat_intelligence_score?.score || '—'}
								/>
								<MetricCard
									label="OWASP Issues"
									value={detailedScan.details?.compliance_readiness?.total_owasp_issues || detailedScan.compliance_readiness?.total_owasp_issues || 0}
								/>
								<MetricCard
									label="Compliance"
									value={detailedScan.details?.compliance_readiness?.overall_compliance_score || detailedScan.compliance_readiness?.overall_compliance_score || '—'}
									unit="%"
								/>
								<MetricCard
									label="Misconfigurations"
									value={detailedScan.details?.security_misconfigurations?.total_misconfigurations || detailedScan.security_misconfigurations?.total_misconfigurations || 0}
								/>
								<MetricCard
									label="Attack Surface"
									value={detailedScan.details?.attack_surface_index?.score || detailedScan.attack_surface_index?.score || '—'}
								/>
								<MetricCard
									label="Vendor Risk"
									value={detailedScan.details?.vendor_risk_rating?.letter_grade || detailedScan.vendor_risk_rating?.letter_grade || '—'}
								/>
							</View>
						</ScrollView>
					</View>
				</View>

			</View>
		</View>
	);
};

// Enhanced Table Row with Expansion
const Row = ({ item, isExpanded, onToggleExpand, onOpenMenu, expandedScanDetails = {}, loadingScanDetails = false }) => {
	if (!item) return null;

	// animate arrow
	const rotateAnim = React.useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
	const actionBtnRef = React.useRef(null);

	React.useEffect(() => {
		Animated.timing(rotateAnim, {
			toValue: isExpanded ? 1 : 0,
			duration: 200,
			useNativeDriver: true,
		}).start();
	}, [isExpanded]);

	const rotation = rotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '105deg'],
	});

	const handleRowPress = () => {
		onToggleExpand();
	};

	const handleActionPress = () => {
		if (!onOpenMenu) return;

		if (actionBtnRef.current && actionBtnRef.current.measureInWindow) {
			actionBtnRef.current.measureInWindow((x, y, width, height) => {
				onOpenMenu(item, { x, y, width, height });
			});
		} else {
			// fallback – open roughly in middle if measure not available
			onOpenMenu(item, null);
		}
	};

	return (
		<View style={{ position: 'relative', zIndex: 1 }}>
			<View
				style={[
					styles.row,
					isExpanded && styles.rowExpanded,
					{ flexDirection: 'row', position: 'relative' },
				]}
			>
				{/* Main row (expand) */}
				<Pressable
					style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
					onPress={handleRowPress}
				>
					<View style={[styles.cell, styles.cellExpand, { minWidth: 30, maxWidth: 30 }]}>
						<Animated.Text style={[styles.expandIcon, { transform: [{ rotate: rotation }] }]}>
							▶
						</Animated.Text>
					</View>

					<View style={[styles.cell, styles.cellScanId, { minWidth: 300, maxWidth: 300 }]}>
						<Text style={styles.scanIdText}>{item.scanId || '—'}</Text>
					</View>

					<View style={[styles.cell, styles.cellCenter, { minWidth: 150, maxWidth: 150 }]}>
						<Text style={styles.normalText}>{item.targetName || '—'}</Text>
					</View>

					<View style={[styles.cell, styles.cellFlex2, { minWidth: 300, maxWidth: 300 }]}>
						<Text
							numberOfLines={1}
							ellipsizeMode="tail"
							style={[styles.normalText, styles.linkText]}
						>
							{item.scanTarget || '—'}
						</Text>
					</View>

					<View style={[styles.cell, styles.cellCenter, { minWidth: 180, maxWidth: 180 }]}>
						<Text style={styles.normalText}>{item.scanStart || '—'}</Text>
					</View>

					<View style={[styles.cell, styles.cellCenter, { minWidth: 180, maxWidth: 180 }]}>
						<Text style={styles.normalText}>{item.scanEnd || '—'}</Text>
					</View>

					<View style={[styles.cell, styles.cellCenter, { minWidth: 120, maxWidth: 120 }]}>
						<StatusPill status={item.status || 'unknown'} />
					</View>
				</Pressable>

				{/* Actions cell – just the button */}
				<View
					style={{
						width: 80,
						alignItems: 'flex-end',
						paddingRight: 12,
						position: 'relative',
					}}
				>
					<ActionMenu ref={actionBtnRef} onPress={handleActionPress} />
				</View>
			</View>

			{isExpanded && (
				<Animated.View style={[styles.expandedRow]}>
					<ExpandedRowDetails 
						scan={expandedScanDetails[item.id] || item}
						originalItem={item} // Pass original item separately for fallback data
						loading={loadingScanDetails && !expandedScanDetails[item.id]}
					/>
				</Animated.View>
			)}
		</View>
	);
};

// Helper Functions
const parseDateParts = input => {
	if (!input) return { date: '—', time: '—' };

	try {
		const date = new Date(input);
		if (Number.isNaN(date.getTime())) throw new Error('invalid date');

		const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
		const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
		return { date: dateStr, time: timeStr };
	} catch (error) {
		return { date: '—', time: '—' };
	}
};

const mapApiScanToRow = (scan, fallbackOrg) => {
	const startParts = parseDateParts(scan?.scanStart || scan?.scan_date || scan?.startDate || scan?.createdAt);
	const endParts = parseDateParts(scan?.scanEnd || scan?.endDate || scan?.updatedAt);
	const rawId = scan?.scan_id || scan?._id || scan?.id || Date.now();
	const formattedId = `#${String(rawId).replace('#', '')}`;

	// Extract alerts and calculate severity counts
	const alerts = Array.isArray(scan?.alerts) ? scan.alerts : [];
	const sevCount = (code) => alerts.filter((a) => a?.riskcode === code).length;

	return {
		id: String(rawId),
		scanId: formattedId,
		targetName: scan?.projectName || scan?.label || scan?.targetName || fallbackOrg || '—',
		scanTarget: scan?.scanTarget || scan?.url || scan?.target || scan?.asset || '—',
		scanStart: startParts.date === '—' ? '—' : `${startParts.date} ${startParts.time}`.trim(),
		scanEnd: endParts.date === '—' ? '—' : `${endParts.date} ${endParts.time}`.trim(),
		status: (scan?.status || 'in-progress').replace(/_/g, ' '),
		organization: scan?.organization?.name || scan?.organizationName || fallbackOrg || '—',
		type: 'AI Scan',
		description: `Security assessment for ${scan?.url || scan?.target || scan?.asset || 'target'}`,
		// Preserve original scan data for duration calculation
		originalScan: scan,
		createdAt: scan?.createdAt,
		updatedAt: scan?.updatedAt,
		scan_date: scan?.scan_date,
		details: {
			vulnerabilities: alerts.length || 0,
			alerts: alerts,
			endpoints: scan?.endpoints,
			openPorts: scan?.attack_surface_index?.metrics?.open_ports_count || 0,
			severity: {
				critical: sevCount("4"),
				high: sevCount("3"),
				medium: sevCount("2"),
				low: sevCount("1"),
				info: sevCount("0"),
			},
			cyber_hygiene_score: scan?.cyber_hygiene_score,
			threat_intelligence: scan?.threat_intelligence,
			compliance_readiness: scan?.compliance_readiness,
			security_misconfigurations: scan?.security_misconfigurations,
			attack_surface_index: scan?.attack_surface_index,
			vendor_risk_rating: scan?.vendor_risk_rating,
		},
	};
};

const getOrganizationId = org => {
	if (!org) return null;
	return org.id || org._id || org.organizationId || org.orgId || null;
};

// Main Component
export default function AssessmentCenter({ onNavigate }) {
	const { currentOrganization, organizations, loadingOrganizations } = useOrganization();
	const { user } = useAuth();
	const [scans, setScans] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);
	const [isPaginating, setIsPaginating] = useState(false);
	// Backend pagination state
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 10,
		pages: 1,
		total: 0
	});
	const [expandedRowId, setExpandedRowId] = useState(null);
	const [expandedScanDetails, setExpandedScanDetails] = useState({}); // Store detailed scan data by ID
	const [loadingScanDetails, setLoadingScanDetails] = useState(false); // Loading state for scan details
	const [showScanModal, setShowScanModal] = useState(false);
	const [activePollingScanIds, setActivePollingScanIds] = useState(new Set());
	const [pollingIntervals, setPollingIntervals] = useState(new Map());
	const [localScans, setLocalScans] = useState([]); // Store locally created scans
	const [downloadingPdfId, setDownloadingPdfId] = useState(null); // Track active PDF download

    	// Global action menu (dropdown) state
	const [actionMenuState, setActionMenuState] = useState({
		visible: false,
		scan: null,
		anchor: null, // { x, y, width, height }
	});

	const openActionMenu = (scan, anchor) => {
		setActionMenuState({
			visible: true,
			scan,
			anchor,
		});
	};

	const closeActionMenu = () => {
		setActionMenuState({
			visible: false,
			scan: null,
			anchor: null,
		});
	};


	const activeOrganization = currentOrganization || organizations?.[0] || null;

	const fetchScans = useCallback(async (pageNum = page, limitNum = pagination.limit) => {
		if (loadingOrganizations) return;

		setLoading(true);
		setError(null);
		setIsPaginating(true);

		try {
			const orgId = getOrganizationId(activeOrganization);
			const orgName = activeOrganization?.name;

			// Call API with pagination parameters
			const response = await scanService.getScans(pageNum, limitNum);
			
			const apiScans = response.data || [];
			const paginationInfo = response.pagination;

			// Update pagination state from backend
			if (paginationInfo) {
				setPagination({
					page: paginationInfo.page || pageNum,
					limit: paginationInfo.limit || limitNum,
					pages: paginationInfo.pages || 1,
					total: paginationInfo.total || 0
				});
				setPage(paginationInfo.page || pageNum);
			}

			const mapped = (apiScans || []).map(scan => mapApiScanToRow(scan, orgName));

			// Merge API scans with local scans, removing duplicates
			const allScans = [...localScans];
			mapped.forEach(apiScan => {
				const existsInLocal = localScans.some(localScan =>
					localScan.id === apiScan.id ||
					localScan.scanTarget === apiScan.scanTarget
				);
				if (!existsInLocal) {
					allScans.push(apiScan);
				}
			});

			// Sort by creation date (newest first)
			allScans.sort((a, b) => new Date(b.scanStart) - new Date(a.scanStart));

			setScans(allScans);
		} catch (err) {
			console.error('Error fetching scans:', err.message);

			// Handle dataset too large error specifically
			// if (err.message.includes('DATASET_TOO_LARGE')) {
			// 	const cleanMessage = err.message.replace('DATASET_TOO_LARGE: ', '');
			// 	setError(`📊 Large Dataset Detected\n\n${cleanMessage}\n\n💡 Tip: You can still create new scans from this app, but viewing scan history requires the web version for large datasets.`);
			// 	// Keep local scans even when API fails
			// 	setScans(localScans);
			// } else if (err.message.includes('too large')) {
			// 	setError('Dataset is very large and cannot be loaded in the mobile app. Please use the web version for large datasets.');
			// 	// Keep local scans even when API fails
			// 	setScans(localScans);
			// } else if (err.message.includes('timeout')) {
			// 	setError('Request timed out. Please try again or check your connection.');
			// 	// Keep local scans even when API fails
			// 	setScans(localScans);
			// } else if (err.message.includes('network') || err.message.includes('fetch')) {
			// 	setError('Network error. Please check your connection and try again.');
			// 	// Keep local scans even when API fails
			// 	setScans(localScans);
			// } else {
			// 	setError('Unable to load scan history right now. Please try again.');
			// 	// Keep local scans even when API fails
			// 	setScans(localScans);
			// }
		} finally {
			setLoading(false);
			setIsPaginating(false);
		}
	}, [activeOrganization, user, loadingOrganizations]); // page and limit are passed as parameters, not needed in deps

	useEffect(() => {
		if (!user && (!organizations || organizations.length === 0)) {
			setScans([]);
			return;
		}
		// Fetch first page on initial load
		fetchScans(1, 10);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, organizations, loadingOrganizations]); // fetchScans is stable due to useCallback

	// Fetch detailed scan data when a row is expanded
	useEffect(() => {
		if (!expandedRowId) {
			return;
		}

		// Check if we already have the detailed data
		if (expandedScanDetails[expandedRowId]) {
			return;
		}

		// Fetch scan details from API using getScanById
		const fetchScanDetails = async () => {
			setLoadingScanDetails(true);
			try {
				console.log('Fetching detailed scan data using getScanById API for ID:', expandedRowId);
				// Use the directly imported getScanById function
				debugger
				const detailedScan = await getScanById(expandedRowId);
				debugger;
				if (detailedScan) {
					// Log the API response structure for debugging
					console.log('getScanById API response structure:', JSON.stringify(detailedScan, null, 2).substring(0, 1000));
					console.log('getScanById - Keys:', Object.keys(detailedScan).join(', '));
					console.log('getScanById - Severity:', detailedScan.severity || detailedScan.details?.severity || 'not found');
					console.log('getScanById - Organization:', detailedScan.organization || detailedScan.organizationName || 'not found');
					console.log('getScanById - Alerts:', Array.isArray(detailedScan.alerts) ? detailedScan.alerts.length : 'not an array');
					
					// Store the detailed scan data in cache
					setExpandedScanDetails(prev => ({
						...prev,
						[expandedRowId]: detailedScan
					}));
					console.log('Successfully fetched and cached detailed scan data for ID:', expandedRowId);
				} else {
					console.warn('No detailed scan data returned from getScanById for ID:', expandedRowId);
				}
			} catch (error) {
				console.error('Error fetching scan details using getScanById:', error.message, error.stack);
				// Don't show error to user, just log it - will use basic scan data as fallback
			} finally {
				setLoadingScanDetails(false);
			}
		};

		fetchScanDetails();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [expandedRowId]); // Only depend on expandedRowId

	// Use backend pagination values instead of calculating from frontend
	const totalPages = pagination.pages || 1;
	const totalScans = pagination.total || scans.length;

	// No need for frontend pagination slicing - backend already paginated
	const paginatedScans = scans;

	const handlePageChange = async (direction) => {
		const currentPage = pagination.page || page;
		const nextPage = currentPage + direction;
		
		// Validate page bounds
		if (nextPage < 1 || nextPage > totalPages) {
			return;
		}

		// Fetch new page from backend
		await fetchScans(nextPage, pagination.limit);
	};

	// Scan polling functions
	const startPollingForScan = useCallback(async (scanId) => {
		if (activePollingScanIds.has(scanId)) {
			return;
		}

		console.log(`Starting to poll scan: ${scanId}`);

		const newActivePollingScanIds = new Set(activePollingScanIds);
		newActivePollingScanIds.add(scanId);
		setActivePollingScanIds(newActivePollingScanIds);

		try {
			const cleanup = await pollScanStatus(scanId, (status, scanData) => {
				console.log(`Scan ${scanId} status update: ${status}`);

				// Update the scan in both lists
				const updateScanInList = (prevScans) => {
					return prevScans.map(scan => {
						const scanIdMatch =
							scan.id.toString() === scanId ||
							scan.id.toString() === scanData?.scan_id?.toString() ||
							scan.id.toString() === scanData?._id?.toString() ||
							scan.id.toString() === scanData?.id?.toString();

						if (scanIdMatch) {
							const updatedScan = mapApiScanToRow(scanData, activeOrganization?.name);
							console.log(`Updated scan ${scanId} with new status: ${updatedScan.status}`);
							return updatedScan;
						}
						return scan;
					});
				};

				setScans(updateScanInList);
				setLocalScans(updateScanInList);

				// Stop polling if scan is completed
				if (status === 'completed' || status === 'failed' || status === 'error') {
					stopPollingForScan(scanId);
					console.log(`Stopped polling for completed scan: ${scanId}`);
					// Don't refresh full list to avoid clearing local scans
					// The scan status is already updated above
				}
			});

			// Store cleanup function if it's valid
			if (cleanup && typeof cleanup === 'function') {
				const newPollingIntervals = new Map(pollingIntervals);
				newPollingIntervals.set(scanId, cleanup);
				setPollingIntervals(newPollingIntervals);
			}
		} catch (error) {
			console.error(`Error starting polling for scan ${scanId}:`, error);
		}
	}, [activePollingScanIds, pollingIntervals, activeOrganization, fetchScans]);

	const stopPollingForScan = useCallback((scanId) => {
		const cleanup = pollingIntervals.get(scanId);
		if (cleanup && typeof cleanup === 'function') {
			try {
				cleanup();
			} catch (error) {
				console.error(`Error calling cleanup for scan ${scanId}:`, error);
			}
			const newPollingIntervals = new Map(pollingIntervals);
			newPollingIntervals.delete(scanId);
			setPollingIntervals(newPollingIntervals);
		}

		const newActivePollingScanIds = new Set(activePollingScanIds);
		newActivePollingScanIds.delete(scanId);
		setActivePollingScanIds(newActivePollingScanIds);

		console.log(`Stopped polling for scan: ${scanId}`);
	}, [pollingIntervals, activePollingScanIds]);

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			pollingIntervals.forEach((cleanup) => {
				if (cleanup && typeof cleanup === 'function') {
					try {
						cleanup();
					} catch (error) {
						console.error('Error during cleanup:', error);
					}
				}
			});
		};
	}, [pollingIntervals]);

	// Start polling for in-progress scans
	useEffect(() => {
		scans.forEach((scan) => {
			if (
				(scan.status === 'in-progress' ||
					scan.status === 'pending' ||
					scan.status === 'running') &&
				!activePollingScanIds.has(scan.id.toString())
			) {
				startPollingForScan(scan.id.toString()).catch(error => {
					console.error(`Failed to start polling for scan ${scan.id}:`, error);
				});
			}
		});
	}, [scans, startPollingForScan, activePollingScanIds]);

	// Handle scan form submission
	const handleScanSubmit = async (formData) => {
		console.log('Handling scan submission:', formData);

		try {
			// Initiate the scan
			const result = await initiateScan(formData);
			console.log('Scan initiated successfully:', result);

			const scanId = result.scan_id || result._id || result.id || Date.now().toString();

			// Create a new scan object for immediate display
			const newScan = {
				_id: scanId,
				url: formData.scanTarget,
				project: formData.projectName || extractDomain(formData.scanTarget),
				organization: formData.organization,
				createdAt: new Date().toISOString(),
				status: 'in-progress',
				scan_date: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			// Add the new scan to the beginning of the list
			const mappedNewScan = mapApiScanToRow(newScan, formData.organization);
			setScans(prevScans => [mappedNewScan, ...prevScans]);

			// Also add to local scans to persist across API failures
			setLocalScans(prevLocalScans => [mappedNewScan, ...prevLocalScans]);

			// Start polling for the new scan
			if (scanId) {
				setTimeout(() => {
					startPollingForScan(scanId.toString()).catch(error => {
						console.error(`Failed to start polling for new scan ${scanId}:`, error);
					});
				}, 2000);
			}

			// Don't auto-refresh for large datasets to avoid clearing local scans
			// The polling will handle status updates for individual scans

		} catch (error) {
			console.error('Error initiating scan:', error);
			throw error; // Re-throw so the modal can handle it
		}
	};

	// Action handlers
	const handleRunAgain = useCallback(async (scan) => {
		try {
			const newScanData = {
				organization: scan.organization,
				projectName: scan.targetName || scan.project,
				targetAsset: 'web',
				scanTarget: scan.scanTarget || scan.asset,
				schedule: 'now',
				disclaimer: true,
			};
			await handleScanSubmit(newScanData);
		} catch (error) {
			console.error('Error re-running scan:', error);
			Alert.alert('Error', 'Failed to re-run scan. Please try again.');
		}
	}, [handleScanSubmit]);

	const handleViewReport = useCallback((scan) => {
		// Navigate to reports page with scan ID
		if (onNavigate) {
			onNavigate('Reports');
		} else {
			Alert.alert('Info', 'Report view will be available soon.');
		}
	}, [onNavigate]);

	const handleDownload = useCallback(async (scan) => {
		if (!scan) {
			console.error('No scan data provided for download');
			Alert.alert('Error', 'An error occurred: No scan data available.');
			return;
		}

		try {
			console.log(`Preparing to download PDF report for scan ${scan.scanId || scan.id}...`);

			// Get the scan ID
			const scanId = scan.id || scan.scanId?.replace('#', '') || scan._id || scan.scan_id;
			
			if (!scanId) {
				throw new Error('Scan ID not found');
			}

			// Download PDF directly from backend API
			console.log(`Downloading PDF report from API for scan: ${scanId}`);
			setDownloadingPdfId(scanId);
			await downloadPdfReportFromApi(scanId);

			console.log(`PDF download for scan ${scanId} completed successfully.`);
		} catch (error) {
			console.error('Failed to generate or download the report:', error);
			Alert.alert(
				'Download Failed',
				`Sorry, the report could not be downloaded.\n\n${error.message || 'Please check the console for errors.'}`,
				[{ text: 'OK' }]
			);
		} finally {
			setDownloadingPdfId(null);
		}
	}, []);

	// CSV download (uses full scan data, same as web)
	const handleDownloadCSV = useCallback(async (scan) => {
		if (!scan) {
			console.error('No scan data provided for CSV download');
			Alert.alert('Error', 'An error occurred: No scan data available.');
			return;
		}

		try {
			console.log(`Preparing to download CSV for scan ${scan.scanId || scan.id}...`);

			const scanId = scan.id || scan.scanId?.replace('#', '') || scan._id || scan.scan_id;
			if (!scanId) throw new Error('Scan ID not found');

			let fullScanData = null;
			if (expandedScanDetails[scanId]) {
				fullScanData = expandedScanDetails[scanId];
				console.log('Using cached detailed scan data for CSV');
			} else {
				console.log('Fetching complete scan data from API for CSV...');
				fullScanData = await getScanById(scanId);
				console.log('Fetched scan data for CSV:', fullScanData ? 'Success' : 'Failed');
			}

			const scanToDownload = fullScanData || scan.originalScan || scan;

			const csvContent = buildSingleComprehensiveCsvReport(scanToDownload);

			const projectName =
				(scanToDownload.project ||
					scanToDownload.projectName ||
					scanToDownload.targetName ||
					scan.targetName ||
					'Unknown').replace(/ /g, '_');
			const fileName = `Defendly_Report_${projectName}_${scanId}.csv`;

			downloadComprehensiveCsvReport(csvContent, fileName);

			console.log(`CSV download for scan ${scanId} initiated successfully.`);
		} catch (error) {
			console.error('Failed to generate or download the CSV report:', error);
			Alert.alert(
				'Download Failed',
				`Sorry, the CSV report could not be downloaded.\n\n${error.message || 'Please check the console for errors.'}`,
				[{ text: 'OK' }]
			);
		}
	}, [expandedScanDetails]);

	console.log('paginatedScans---->', paginatedScans);
        // ---- position for global action menu ----
    const menuPosition = (() => {
        const padding = 8;

        if (!actionMenuState.visible || !actionMenuState.anchor) {
            return {
                top: 200,
                left: WINDOW.width - MENU_WIDTH - 24,
            };
        }

        const { x, y, width, height } = actionMenuState.anchor;

        // place just below the button
        let top = y + height + 4;
        let left = x + width - MENU_WIDTH;

        // clamp horizontally so menu stays on screen
        const maxLeft = WINDOW.width - MENU_WIDTH - padding;
        if (left < padding) left = padding;
        if (left > maxLeft) left = maxLeft;

        // simple vertical clamp so it doesn't fall off bottom
        const maxTop = WINDOW.height - 160; // 160 ≈ menu height
        if (top > maxTop) top = maxTop;

        return { top, left };
    })();

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Assessment Center</Text>
					<Text style={styles.subtitle}>Launch security assessments and view scan results</Text>
				</View>
				{/* Cards */}
				<View style={styles.cardsRow}>
					<TouchableOpacity
						style={styles.card}
						onPress={() => setShowScanModal(true)}
						activeOpacity={0.8}
					>
						<Image source={download} style={styles.cardIcon} />
						<Text style={styles.cardTitle}>Initiate Intelligent Scanning</Text>
						<Text style={styles.cardText}>
							Run intelligent automated network and web-application scans to detect vulnerabilities, misconfigurations, and gaps in security controls.
						</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.card} onPress={() => { }} activeOpacity={0.8}>
						<Image source={brain} style={styles.cardIcon} />
						<Text style={styles.cardTitle}>Need Advanced Testing?</Text>
						<Text style={styles.cardText}>
							Looking for in-depth security testing, cloud posture audits, or desktop application assessments? Request guidance from our security specialists now.
						</Text>
					</TouchableOpacity>
				</View>

				{/* Table */}
				<View style={styles.tableCard}>
					<View style={styles.tableHeader}>
						<View>
							<Text style={styles.tableTitle}>Scan History</Text>
							<Text style={styles.tableSubtitle}>Comprehensive security assessment results and metrics</Text>
						</View>
						<TouchableOpacity style={styles.refreshBtn} onPress={fetchScans} disabled={loading}>
							<Text style={styles.refreshText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
						</TouchableOpacity>
					</View>

					{error && <Text style={styles.errorText}>{error}</Text>}

					{loading ? (
						<View style={styles.loadingWrapper}>
							<ActivityIndicator color="#2563EB" />
							<Text style={styles.loadingText}>Loading scan data...</Text>
						</View>
					) : paginatedScans.length > 0 ? (
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							<View>
								{/* Column headers */}
								<View style={[styles.row, styles.headerRow]}>
									<Text style={[styles.th, styles.cellExpand, { minWidth: 40, maxWidth: 40 }]}></Text>
									<Text style={[styles.th, styles.cellScanId, { minWidth: 300, maxWidth: 300 }]}>SCAN ID</Text>
									<Text style={[styles.th, styles.cellCenter, { minWidth: 150, maxWidth: 150 }]}>TARGET NAME</Text>
									<Text style={[styles.th, styles.cellFlex2, { minWidth: 300, maxWidth: 300, overflow: 'hidden' }]}>SCAN TARGET</Text>
									<Text style={[styles.th, styles.cellCenter, { minWidth: 180, maxWidth: 180, overflow: 'hidden' }]}>SCAN START</Text>
									<Text style={[styles.th, styles.cellCenter, { minWidth: 180, maxWidth: 180, overflow: 'hidden' }]}>SCAN END</Text>
									<Text style={[styles.th, styles.cellCenter, { minWidth: 120, maxWidth: 120, overflow: 'hidden' }]}>STATUS</Text>
									<Text style={[styles.th, styles.cellActions, { minWidth: 80, maxWidth: 80 }]}>ACTIONS</Text>
								</View>

								{/* Rows */}
								{paginatedScans.map((item, index) => (
									<View key={item.id || index}>
										<Row
                                            item={item}
                                            isExpanded={expandedRowId === item.id}
                                            onToggleExpand={() => {
                                                setExpandedRowId(expandedRowId === item.id ? null : item.id);
                                            }}
                                            onOpenMenu={openActionMenu}
                                            expandedScanDetails={expandedScanDetails}
                                            loadingScanDetails={loadingScanDetails}
                                        />
										<View style={styles.separator} />
									</View>
								))}
							</View>
						</ScrollView>
					) : (
						<View style={styles.emptyState}>
							<Text style={styles.emptyTitle}>No Scan History</Text>
							<Text style={styles.emptySubtitle}>
								Your completed and in-progress scans will appear here.
							</Text>
						</View>
					)}

					{/* Pagination */}
					<View style={styles.tableFooter}>
						<Text style={styles.footerText}>
							Page {pagination.page || page} of {totalPages} 
							{totalScans > 0 && ` (${totalScans} total)`}
						</Text>
						<View style={styles.pagination}>
							<TouchableOpacity
								style={[styles.pageBtn, (pagination.page === 1 || page === 1) && styles.pageBtnDisabled]}
								onPress={() => handlePageChange(-1)}
								disabled={pagination.page === 1 || page === 1 || isPaginating}>
								<Text style={styles.pageBtnText}>‹</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.pageBtn, (pagination.page === totalPages || page === totalPages) && styles.pageBtnDisabled]}
								onPress={() => handlePageChange(1)}
								disabled={pagination.page === totalPages || page === totalPages || isPaginating}>
								<Text style={styles.pageBtnText}>›</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</ScrollView>
			<ScanModal
				visible={showScanModal}
				onClose={() => setShowScanModal(false)}
				onSubmit={handleScanSubmit}
			/>
            {/* Global action dropdown (screen-level, not clipped by row) */}
            {actionMenuState.visible && (
                <Pressable
                style={styles.globalMenuOverlay}
                onPress={closeActionMenu}
                >
                <View
                    style={[
                    styles.globalMenuContainer,
                    actionMenuState.anchor
                        ? {
                            top: actionMenuState.anchor.y + actionMenuState.anchor.height + 4,
                            left:
                            actionMenuState.anchor.x +
                            actionMenuState.anchor.width -
                            180, // 180 = menu width
                        }
                        : { top: 200, right: 24 }, // fallback position
                    ]}
                >
                    <Pressable
                    style={styles.globalMenuItem}
                    onPress={() => {
                        closeActionMenu();
                        handleRunAgain(actionMenuState.scan);
                    }}
                    >
                    <Text style={styles.globalMenuItemText}>▶ Run Again</Text>
                    </Pressable>

                    {/* <Pressable
                    style={[
                        styles.globalMenuItem,
                        !isScanCompleted(actionMenuState.scan) &&
                        styles.globalMenuItemDisabled,
                    ]}
                    disabled={!isScanCompleted(actionMenuState.scan)}
                    onPress={() => {
                        if (!isScanCompleted(actionMenuState.scan)) return;
                        closeActionMenu();
                        handleViewReport(actionMenuState.scan);
                    }}
                    >
                    <Text
                        style={[
                        styles.globalMenuItemText,
                        !isScanCompleted(actionMenuState.scan) &&
                            styles.globalMenuItemTextDisabled,
                        ]}
                    >
                        ◎ View Report
                    </Text>
                    </Pressable> */}

                    <Pressable
                    style={[
                        styles.globalMenuItem,
                        styles.globalMenuItemLast,
                        !isScanCompleted(actionMenuState.scan) &&
                        styles.globalMenuItemDisabled,
                    ]}
                    disabled={!isScanCompleted(actionMenuState.scan)}
                    onPress={() => {
                        if (!isScanCompleted(actionMenuState.scan)) return;
                        closeActionMenu();
                        handleDownload(actionMenuState.scan);
                    }}
                    >
                    <Text
                        style={[
                        styles.globalMenuItemText,
                        !isScanCompleted(actionMenuState.scan) &&
                            styles.globalMenuItemTextDisabled,
                        ]}
                    >
                        ↓ Download Pdf
                    </Text>
                    </Pressable>
                    <Pressable
                    style={[
                        styles.globalMenuItem,
                        styles.globalMenuItemLast,
                        !isScanCompleted(actionMenuState.scan) &&
                        styles.globalMenuItemDisabled,
                    ]}
                    disabled={!isScanCompleted(actionMenuState.scan)}
                    onPress={() => {
                        if (!isScanCompleted(actionMenuState.scan)) return;
                        closeActionMenu();
                        handleDownloadCSV(actionMenuState.scan);
                    }}
                    >
                    <Text
                        style={[
                        styles.globalMenuItemText,
                        !isScanCompleted(actionMenuState.scan) &&
                            styles.globalMenuItemTextDisabled,
                        ]}
                    >
                        ↓ Download CSV
                    </Text>
                    </Pressable>
                </View>
                {/* <View style={[styles.globalMenuContainer, menuPosition]}></View> */}
                </Pressable>
            )}

			{/* Downloading overlay */}
			{downloadingPdfId && (
				<View style={styles.downloadOverlay}>
					<View style={styles.downloadOverlayCard}>
						<ActivityIndicator color="#2563EB" size="large" />
						<Text style={styles.downloadOverlayText}>
							Downloading PDF report...
						</Text>
					</View>
				</View>
			)}

		</View>
	);
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#F1F8FD' },
	container: { padding: 16, paddingBottom: 48 },

	header: { marginBottom: 16 },
	title: { fontSize: 24, fontWeight: '700', color: '#111827' },
	subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },

	cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
	card: {
		flex: 1,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 2,
	},
	cardIcon: { width: 24, height: 24, marginBottom: 8 },
	cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, color: '#111827' },
	cardText: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

	tableCard: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
	tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomColor: '#E5E7EB', borderBottomWidth: 1, padding: 16, backgroundColor: '#f9fafb' },
	tableTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
	tableSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
	refreshBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
	refreshText: { color: '#374151', fontSize: 13 },
	errorText: { color: '#b91c1c', marginBottom: 8, fontSize: 13 },

	headerRow: { backgroundColor: '#F8FAFC', paddingVertical: 12 },
	row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 12, position: 'relative' },
	cell: { paddingHorizontal: 8, justifyContent: 'center' },
	cellScanId: { flex: 0.9 },
	cellCenter: { flex: 0.7 },
	cellFlex2: { flex: 2.6 },
	cellActions: { flex: 0.6, position: 'relative' },

	th: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

	scanIdText: { color: '#2563EB', fontSize: 13, fontWeight: '500' },
	normalText: { color: '#374151', fontSize: 13 },
	linkText: { color: '#374151' },

	statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, alignSelf: 'flex-start' },
	statusText: { fontSize: 11, fontWeight: '600' },

	actionBtn: { padding: 6, alignItems: 'center', justifyContent: 'center' },
	actionText: { fontSize: 18, color: '#6B7280' },

	separator: { height: 1, backgroundColor: '#EEF2F7' },
	listWrapper: { marginTop: 4 },
	loadingWrapper: { alignItems: 'center', paddingVertical: 24, gap: 8 },
	loadingText: { fontSize: 13, color: '#6B7280' },

	emptyState: { alignItems: 'center', paddingVertical: 32, gap: 6 },
	emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
	emptySubtitle: { fontSize: 13, color: '#6B7280' },

	tableFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
	footerText: { color: '#6B7280', fontSize: 13 },
	pagination: { flexDirection: 'row', gap: 8 },
	pageBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
	pageBtnText: { fontSize: 14, color: '#374151' },
	pageBtnDisabled: { opacity: 0.5 },

	// New styles for expanded functionality
	cellExpand: { flex: 0.3, alignItems: 'center' },
	expandIcon: { fontSize: 12, color: '#6B7280' },
	rowExpanded: { backgroundColor: '#F8FAFC' },
	expandedRow: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 16 },

	expandedDetails: { flex: 1 },

	// Three column layout
	threeColumnLayout: {
		flexDirection: 'row',
		gap: 16,
		minHeight: 300,
		width: '100%',
		maxWidth: 1320
	},
	column: {
		flex: 1,
		minWidth: 0,
		maxWidth: '33.33%',
	},

	detailSection: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		height: '100%',
	},
	sectionHeader: { marginBottom: 16 },
	sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
	sectionSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },

	// Scan Summary styles
	fullWidthMetric: {
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		marginBottom: 12,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	summaryGrid: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 12,
	},
	metricCard: {
		flex: 1,
		backgroundColor: '#ffffff',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		borderWidth: 1,
		flexBasis: '48%',
		borderColor: '#e5e7eb',
		minHeight: 60,
	},
	metricLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
	metricValue: { fontSize: 13, fontWeight: '600', color: '#111827', flexWrap: 'wrap' },
	metricUnit: { fontSize: 11, fontWeight: '400' },

	// Vulnerabilities styles
	vulnerabilitiesContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 12,
	},
	severityGridCompact: {
		flex: 1,
		gap: 8,
	},
	severityRow: {
		flexDirection: 'row',
		gap: 8,
	},
	severityBox: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		borderWidth: 2,
		flexShrink: 0,
		minHeight: 40,
		maxWidth: 120,
		minWidth: 120,
	},
	severityBoxPlaceholder: {
		flex: 1,
		opacity: 0,
	},
	severityLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },
	severityCount: { fontSize: 16, fontWeight: '700' },

	donutContainer: { 
		width: 160, 
		height: 160, 
		alignItems: 'center', 
		justifyContent: 'center',
		position: 'relative',
		marginLeft: 24,
		flexShrink: 0,
	},
	donutSvg: {
		position: 'absolute',
	},
	donutCenter: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
		width: 160,
		height: 160,
	},
	donutTotal: { 
		fontSize: 24, 
		fontWeight: '700', 
		color: '#111827',
		textAlign: 'center',
	},
	donutChartEmpty: {
		width: 160,
		height: 160,
		borderRadius: 80,
		backgroundColor: '#F3F4F6',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#E5E7EB',
	},
	donutEmptyText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

	// Additional Metrics styles
	metricsGridCompact: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
    	globalMenuOverlay: {
		position: 'absolute',
		top: -95,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'transparent',
		zIndex: 9999,
	},

	globalMenuContainer: {
		position: 'absolute',
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		minWidth: 180,
		shadowColor: '#000',
		shadowOpacity: 0.25,
		shadowRadius: 6,
		elevation: 20,
	},

	globalMenuItem: {
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderBottomColor: '#E5E7EB',
		borderBottomWidth: 1,
	},

	globalMenuItemLast: {
		borderBottomWidth: 0,
	},

	globalMenuItemDisabled: {
		opacity: 0.5,
	},

	globalMenuItemText: {
		fontSize: 14,
		color: '#374151',
		fontWeight: '500',
	},

	globalMenuItemTextDisabled: {
		color: '#9CA3AF',
	},

	downloadOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(255,255,255,0.6)',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 10000,
	},
	downloadOverlayCard: {
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		width: 220,
	},
	downloadOverlayText: {
		marginTop: 10,
		color: '#374151',
		fontSize: 14,
		fontWeight: '600',
		textAlign: 'center',
	},
});
