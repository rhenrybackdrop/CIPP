import React, { useEffect, useRef, useState } from 'react'
import {
  CButton,
  CButtonGroup,
  CCallout,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CCol,
  CFormLabel,
  CNav,
  CNavItem,
  CRow,
  CTabContent,
  CTabPane,
  CForm,
  CListGroup,
  CListGroupItem,
  CBadge,
  CLink,
  CAlert,
} from '@coreui/react'
import {
  useLazyExecClearCacheQuery,
  useLazyExecNotificationConfigQuery,
  useLazyExecPermissionsAccessCheckQuery,
  useLazyExecTenantsAccessCheckQuery,
  useLazyListNotificationConfigQuery,
} from '../../store/api/app'
import {
  useLazyListExcludedTenantsQuery,
  useLazyExecExcludeTenantQuery,
} from '../../store/api/tenants'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleNotch, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { CippTable, TenantSelectorMultiple } from '../../components/cipp'
import DataTable from 'react-data-table-component'
import { useListTenantsQuery } from '../../store/api/tenants'
import { useLazyEditDnsConfigQuery, useLazyGetDnsConfigQuery } from '../../store/api/domains'
import { setModalContent } from '../../store/features/modal'
import { useDispatch } from 'react-redux'
import { TenantSelector } from '../../components/cipp'
import { RFFCFormSwitch, RFFCFormInput } from '../../components/RFFComponents'
import { Form } from 'react-final-form'
import { CippPage } from '../../components/CippPage'
import useConfirmModal from '../../hooks/useConfirmModal'

const CIPPSettings = () => {
  const [active, setActive] = useState(1)
  return (
    <CippPage title="Settings" tenantSelector={false}>
      <CNav variant="tabs" role="tablist">
        <CNavItem active={active === 1} onClick={() => setActive(1)} href="#">
          General
        </CNavItem>
        <CNavItem active={active === 2} onClick={() => setActive(2)} href="#">
          Excluded Tenants
        </CNavItem>
        <CNavItem active={active === 3} onClick={() => setActive(3)} href="#">
          Backend
        </CNavItem>
        <CNavItem active={active === 4} onClick={() => setActive(4)} href="#">
          Notifications
        </CNavItem>
      </CNav>
      <CTabContent>
        <CTabPane visible={active === 1} className="mt-3">
          <GeneralSettings />
        </CTabPane>
        <CTabPane visible={active === 2} className="mt-3">
          <ExcludedTenantsSettings />
        </CTabPane>
        <CTabPane visible={active === 3} className="mt-3">
          <SecuritySettings />
        </CTabPane>
        <CTabPane visible={active === 4} className="mt-3">
          <NotificationsSettings />
        </CTabPane>
      </CTabContent>
    </CippPage>
  )
}

export default CIPPSettings

const checkAccessColumns = [
  {
    name: 'Tenant Domain',
    selector: (row) => row['tenantDomain'],
  },
  {
    name: 'Result',
    selector: (row) => row['result'],
  },
]

const GeneralSettings = () => {
  const dispatch = useDispatch()
  const { data: tenants = [] } = useListTenantsQuery()
  const [checkPermissions, permissionsResult] = useLazyExecPermissionsAccessCheckQuery()
  const [clearCache, clearCacheResult] = useLazyExecClearCacheQuery()
  const [checkAccess, accessCheckResult] = useLazyExecTenantsAccessCheckQuery()
  const [selectedTenants, setSelectedTenants] = useState([])
  const [showMaxSelected, setShowMaxSelected] = useState(false)
  const maxSelected = 3
  const tenantSelectorRef = useRef(null)

  const handleSetSelectedTenants = (values) => {
    if (values.length <= maxSelected) {
      setSelectedTenants(values)
      setShowMaxSelected(false)
    } else {
      setShowMaxSelected(true)
      // close the tenant selector, hacky but no other way to do this
      // without making a fully custom selector
      // https://github.com/tbleckert/react-select-search#headless-mode-with-hooks
      tenantSelectorRef.current?.firstChild?.firstChild?.blur()

      // re-set selected tenants to force a re-render? nope doesnt work
      // https://github.com/tbleckert/react-select-search/issues/221
      const temp = selectedTenants
      setSelectedTenants([])
      setSelectedTenants(temp)
    }
  }

  const handleCheckAccess = () => {
    // convert customerId into tenant domain
    // domain is not unique or it would be used as value
    const mapped = tenants.reduce(
      (current, { customerId, ...rest }) => ({
        ...current,
        [customerId]: { ...rest },
      }),
      {},
    )
    const tenantDomains = selectedTenants.map((customerId) => mapped[customerId].defaultDomainName)

    checkAccess({ tenantDomains })
  }

  const handleClearCache = useConfirmModal({
    body: <div>Are you sure you want to clear the cache?</div>,
    onConfirm: () => clearCache(),
  })

  const tableProps = {
    pagination: false,
  }

  return (
    <div>
      <CRow className="mb-3">
        <CCol md={6}>
          <CCard className="h-100">
            <CCardHeader>
              <CCardTitle>Permissions Check</CCardTitle>
            </CCardHeader>
            <CCardBody>
              Click the button below to start a permissions check. <br />
              <CButton
                onClick={() => checkPermissions()}
                disabled={permissionsResult.isFetching}
                className="mt-3"
              >
                {permissionsResult.isFetching && (
                  <FontAwesomeIcon icon={faCircleNotch} spin className="me-2" size="1x" />
                )}
                Run Permissions Check
              </CButton>
              {permissionsResult.status === 'fulfilled' && (
                // @todo make this pretty after API is fixed
                <div>{permissionsResult.data.map((result) => result)}</div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={6}>
          <CCard className="h-100">
            <CCardHeader>
              <CCardTitle>Clear Cache</CCardTitle>
            </CCardHeader>
            <CCardBody>
              Click the button below to clear the tenant cache file, the Best Practice Analyser
              cache and the Domain Analyser Cache. <br />
              <CButton
                onClick={() => handleClearCache()}
                disabled={clearCacheResult.isFetching}
                className="mt-3"
              >
                {clearCacheResult.isFetching && (
                  <FontAwesomeIcon icon={faCircleNotch} spin className="me-2" size="1x" />
                )}
                Clear Cache
              </CButton>
              {clearCacheResult.isSuccess && (
                <div className="mt-3">{clearCacheResult.data?.Results}</div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
      <CRow className="mb-3">
        <CCol md={6}>
          <CCard className="h-100">
            <CCardHeader>
              <CCardTitle>Tenant Access Check</CCardTitle>
            </CCardHeader>
            <CCardBody>
              <div className="mb-3">
                Click the button below to start a tenant access check. You can select multiple
                tenants up to a maximum of {maxSelected} tenants at one time.
              </div>

              <TenantSelectorMultiple
                ref={tenantSelectorRef}
                values={selectedTenants}
                onChange={handleSetSelectedTenants}
              />
              {showMaxSelected && (
                <CCallout color="warning">
                  A maximum of {maxSelected} tenants can be selected at once.
                </CCallout>
              )}
              <br />
              <CButton onClick={() => handleCheckAccess()} disabled={accessCheckResult.isFetching}>
                {accessCheckResult.isFetching && (
                  <FontAwesomeIcon icon={faCircleNotch} spin className="me-2" size="1x" />
                )}
                Run access check
              </CButton>
              {accessCheckResult.isSuccess && (
                <CippTable
                  columns={checkAccessColumns}
                  tableProps={tableProps}
                  data={accessCheckResult.data}
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol>
          <DNSSettings />
        </CCol>
      </CRow>
    </div>
  )
}

const ExcludedTenantsSettings = () => {
  const [
    listExcludedTenants,
    {
      data: excludedTenants = [],
      isFetching: excludedTenantsFetching,
      isSuccess: excludedTenantsSuccess,
    },
  ] = useLazyListExcludedTenantsQuery()
  const [removeExcludedTenant, exRemovalResult] = useLazyExecExcludeTenantQuery()

  useEffect(() => {
    listExcludedTenants()
  }, [])

  const dispatch = useDispatch()
  const handleRemoveExclusion = (domain) => {
    dispatch(
      setModalContent({
        componentType: 'confirm',
        title: 'Confirm',
        body: <div>Are you sure you want to remove the exclusion for {domain}?</div>,
        onConfirm: () => removeExcludedTenant(domain),
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
        visible: true,
      }),
    )
    //todo, reload the table too. Currently not done because it has a memo, and the table does not reload because of this automatically.
  }

  const handleExcludeTenant = () => {
    dispatch(
      setModalContent({
        componentType: 'confirm',
        title: 'Select tenant',
        body: (
          <div style={{ overflow: 'visible' }}>
            <div>Select a tenant to exclude</div>
            <TenantSelector />
          </div>
        ),
        //onConfirm: () => addExcludedTenant(),
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
        visible: true,
      }),
    )
  }

  return (
    <>
      {exRemovalResult.isSuccess && <CAlert color="success">{exRemovalResult.data.Results}</CAlert>}
      <CRow className="mb-3">
        <CCol md={12}>
          <CCard>
            <CCardHeader>
              <CCardTitle>
                Excluded Tenant List
                <CButton
                  style={{ position: 'absolute', right: '5px' }}
                  className="text-white"
                  size="sm"
                  href="#"
                  onClick={() => handleExcludeTenant()}
                >
                  Add Excluded Tenant
                </CButton>
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              {excludedTenantsSuccess && (
                <CListGroup>
                  {excludedTenants.map((name) => (
                    <CListGroupItem key={name.Name}>
                      {name.Name}
                      <CBadge
                        color="secondary"
                        shape="rounded-pill"
                        style={{ position: 'absolute', right: '40px' }}
                      >
                        Added by {name.User} on {name.Date}
                      </CBadge>
                      <CLink href="#">
                        <FontAwesomeIcon
                          style={{ position: 'absolute', right: '15px' }}
                          color="primary"
                          icon={faTrashAlt}
                          size="sm"
                          onClick={() => handleRemoveExclusion(name.Name)}
                        />
                      </CLink>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}
const SecuritySettings = () => {
  return (
    <div>
      <>
        <CRow className="mb-3">
          <CCol md={4}>
            <CCard>
              <CCardHeader>
                <CCardTitle>Resource Group</CCardTitle>
              </CCardHeader>
              <CCardBody className="equalheight">
                The Resource group contains all the CIPP resources in your tenant, except the SAM
                Application <br /> <br />
                <CButton>Go to Resource Group</CButton>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={4}>
            <CCard>
              <CCardHeader>
                <CCardTitle>Key Vault</CCardTitle>
              </CCardHeader>
              <CCardBody className="equalheight">
                The keyvault allows you to check token information. By default you do not have
                access.
                <br /> <br />
                <CButton>Go to Keyvault</CButton>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={4}>
            <CCard>
              <CCardHeader>
                <CCardTitle>Static Web App (Role Management)</CCardTitle>
              </CCardHeader>
              <CCardBody className="equalheight">
                The Statis Web App role management allows you to invite other users to the
                application.
                <br /> <br />
                <CButton>Go to Role Management</CButton>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol md={4}>
            <CCard>
              <CCardHeader>
                <CCardTitle>Function App (Deployment Center)</CCardTitle>
              </CCardHeader>
              <CCardBody className="equalheight">
                The Function App Deployment Center allows you to run updates on the API
                <br /> <br />
                <CButton>Go to Function App Deployment Center</CButton>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={4}>
            <CCard>
              <CCardHeader>
                <CCardTitle>Function App (Configuration)</CCardTitle>
              </CCardHeader>
              <CCardBody className="equalheight">
                At the Function App Configuration you can check the status of the API access to your
                keyvault <br /> <br />
                <CButton>Go to Function App Configuration</CButton>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={4}>
            <CCard>
              <CCardHeader>
                <CCardTitle>Function App (Overview)</CCardTitle>
              </CCardHeader>
              <CCardBody className="equalheight">
                At the function App Overview, you can stop and start the backend API <br /> <br />
                <CButton>Go to Function App Overview</CButton>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </>
    </div>
  )
}

const NotificationsSettings = () => {
  //to post settings
  const [configNotifications, notificationConfigResult] = useLazyExecNotificationConfigQuery()

  const onSubmit = (values) => {
    // @todo bind this
    // window.alert(JSON.stringify(values))
    console.log(values)
    configNotifications(values)
  }
  //to get current settings
  const [listNotification, notificationListResult] = useLazyListNotificationConfigQuery()
  //todo: Replace with prettier sliders etc
  return (
    <>
      {notificationListResult.isUninitialized && listNotification()}
      {notificationListResult.isFetching && (
        <FontAwesomeIcon icon={faCircleNotch} spin className="me-2" size="1x" />
      )}
      {!notificationListResult.isFetching && notificationListResult.error && (
        <span>Error loading data</span>
      )}
      {notificationListResult.isSuccess && (
        <Form
          initialValues={{ ...notificationListResult.data }}
          onSubmit={onSubmit}
          render={({ handleSubmit, submitting, values }) => {
            return (
              <CForm onSubmit={handleSubmit}>
                <CCol md={6}>
                  <CCol md={6}>
                    <RFFCFormInput type="text" name="email" label="E-mail" />
                  </CCol>
                  <CCol md={6}>
                    <RFFCFormInput type="text" name="webhook" label="Webhook" />
                  </CCol>
                  <CFormLabel>
                    Choose which types of updates you want to receive. This notification will be
                    sent every 30 minutes.
                  </CFormLabel>
                  <br />
                  <RFFCFormSwitch
                    name="addUser"
                    label="New Accounts created via CIPP"
                    value={false}
                  />
                  <RFFCFormSwitch
                    name="removeUser"
                    label="Removed Accounts via CIPP"
                    value={false}
                  />
                  <RFFCFormSwitch
                    name="addChocoApp"
                    label="New Applications added via CIPP"
                    value={false}
                  />
                  <RFFCFormSwitch
                    name="addPolicy"
                    label="New Policies added via CIPP"
                    value={false}
                  />
                  <RFFCFormSwitch
                    name="addStandardsDeploy"
                    label="New Standards added via CIPP"
                    value={false}
                  />
                  <RFFCFormSwitch
                    name="removeStandard"
                    label="Removed Standards via CIPP"
                    value={false}
                  />
                  <RFFCFormSwitch name="tokenUpdater" label="Token Refresh Events" value={false} />

                  <br></br>
                  <CButton
                    className="text-white"
                    disabled={notificationConfigResult.isFetching}
                    type="submit"
                  >
                    Set Notification Settings
                  </CButton>
                  {notificationConfigResult.isSuccess && (
                    <CAlert color="success">{notificationConfigResult.data.Results}</CAlert>
                  )}
                </CCol>
              </CForm>
            )
          }}
        />
      )}
    </>
  )
}
const DNSSettings = () => {
  const [getDnsConfig, getDnsConfigResult] = useLazyGetDnsConfigQuery()
  const [editDnsConfig, editDnsConfigResult] = useLazyEditDnsConfigQuery()

  const [alertVisible, setAlertVisible] = useState(false)

  const switchResolver = (resolver) => {
    editDnsConfig({ resolver })
    getDnsConfig()
    setAlertVisible(true)
    setTimeout(() => {
      setAlertVisible(false)
    }, 2000)
  }

  const resolvers = ['Google', 'Cloudflare']

  return (
    <>
      {getDnsConfigResult.isUninitialized && getDnsConfig()}
      {getDnsConfigResult.isSuccess && (
        <CCard className="h-100">
          <CCardHeader>
            <CCardTitle>DNS Resolver</CCardTitle>
          </CCardHeader>
          <CCardBody>
            Select a DNS resolver to use for Domain Analysis. <br />
            <CButtonGroup role="group" aria-label="Resolver" className="my-3">
              {resolvers.map((r, index) => (
                <CButton
                  onClick={() => switchResolver(r)}
                  color={r === getDnsConfigResult.data.Resolver ? 'primary' : 'secondary'}
                  key={index}
                >
                  {r}
                </CButton>
              ))}
            </CButtonGroup>
            {(editDnsConfigResult.isSuccess || editDnsConfigResult.isError) && (
              <CAlert
                color={editDnsConfigResult.isSuccess ? 'success' : 'danger'}
                visible={alertVisible}
              >
                {editDnsConfigResult.isSuccess
                  ? editDnsConfigResult.data.Results
                  : 'Error setting resolver'}
              </CAlert>
            )}
          </CCardBody>
        </CCard>
      )}
    </>
  )
}
