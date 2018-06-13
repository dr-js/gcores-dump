// TODO: merge to single base function, use random id
const initRenderModal = ({ T }) => {
  const {
    qS,
    cE,
    aCL,
    Dr: {
      Common: {
        Format,
        Error: { catchAsync },
        Function: { createInsideOutPromise }
      }
    }
  } = window

  const renderLoading = (isLoading) => {
    if (!isLoading) return qS('#loading') && qS('#loading').remove()
    !qS('#loading') && document.body.appendChild(cE('div', { id: 'loading' }, [
      cE('div', { id: 'loading-main', innerText: T('text-loading') }),
      cE('div', { id: 'loading-mask' })
    ]))
    setTimeout(() => { if (qS('#loading')) qS('#loading').style.opacity = 1 }, 200)
  }
  const withLoading = async (func, ...args) => {
    renderLoading(true)
    const { result, error } = await catchAsync(func, ...args)
    renderLoading(false)
    if (error) { throw error } else return result
  }
  const stringShorten = (string = '') => string.length > 48
    ? `${string.slice(0, 16)}...${string.slice(-16)}`
    : string
  const updateLoadingStatus = (operation, subject, current, total, size) => {
    const loadingMain = qS('#loading-main')
    if (loadingMain) loadingMain.innerText = `[${current}/${total} - ${Format.binary(size)}B]\n${operation}\n${stringShorten(subject)}`
  }

  const renderModal = (isModal) => {
    if (!isModal) return qS('#modal') && qS('#modal').remove()
    !qS('#modal') && document.body.appendChild(cE('div', { id: 'modal' }, [
      cE('div', { id: 'modal-main', className: 'flex-column' }),
      cE('div', { id: 'modal-mask' })
    ]))
  }
  const withModal = async (func, ...args) => {
    renderModal(true)
    const { result, error } = await catchAsync(func, ...args)
    renderModal(false)
    if (error) { throw error } else return result
  }
  const updateModalMain = (elementList = []) => { qS('#modal-main') && aCL(qS('#modal-main'), elementList) }
  const asyncRenderModal = (getElementList, onResolve = () => {}) => withModal(async () => {
    const { promise, resolve } = createInsideOutPromise()
    updateModalMain(await getElementList(resolve))
    return onResolve(await promise)
  })

  const updateStorageStatus = ({ mainStore }) => {
    if (!qS('#storage-status')) return
    const { storageStatus: { value } } = mainStore.getState()
    qS('#storage-status').innerText = `${Format.binary(value)}B`
  }

  return { renderLoading, withLoading, updateLoadingStatus, asyncRenderModal, updateStorageStatus }
}

export { initRenderModal }
