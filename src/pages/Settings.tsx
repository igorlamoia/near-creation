import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { type Channel, id, money, number } from '../lib/domain'
import PrinterSettings from '../components/PrinterSettings'
import Modal from '../components/Modal'
import IconAction from '../components/IconAction'
import DecimalInput from '../components/DecimalInput'
import Field from '../components/Field'
import SectionHeading from '../components/SectionHeading'
import { useAppStore } from '../store/useAppStore'

export default function Settings() {
  const { db, commit, setNotice: flash } = useAppStore()
  const [channelDraft, setChannelDraft] = useState({
    name: '',
    fixedFee: 0,
    percentFee: 0,
  })
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [editingChannelId, setEditingChannelId] = useState('')
  function openAddChannel() {
    setEditingChannelId('')
    setChannelDraft({ name: '', fixedFee: 0, percentFee: 0 })
    setChannelModalOpen(true)
  }
  function openEditChannel(channel: Channel) {
    setEditingChannelId(channel.id)
    setChannelDraft({
      name: channel.name,
      fixedFee: channel.fixedFee,
      percentFee: channel.percentFee,
    })
    setChannelModalOpen(true)
  }
  async function saveChannel(event: FormEvent) {
    event.preventDefault()
    const name = channelDraft.name.trim()
    if (
      !name ||
      !Number.isFinite(channelDraft.fixedFee) ||
      !Number.isFinite(channelDraft.percentFee) ||
      channelDraft.fixedFee < 0 ||
      channelDraft.percentFee < 0 ||
      channelDraft.percentFee >= 100
    )
      return flash('Informe um canal e taxas válidas.')
    const channel: Channel = {
      id: editingChannelId || id(),
      name,
      fixedFee: channelDraft.fixedFee,
      percentFee: channelDraft.percentFee,
    }
    const channels = editingChannelId
      ? db.settings.channels.map((item) => (item.id === editingChannelId ? channel : item))
      : [...db.settings.channels, channel]
    if (
      await commit(
        { ...db, settings: { ...db.settings, channels } },
        editingChannelId ? 'Canal atualizado.' : 'Canal cadastrado.',
      )
    )
      setChannelModalOpen(false)
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">PREFERÊNCIAS</span>
          <h1>Configurações</h1>
          <p>Defina os custos que alimentam todas as suas precificações.</p>
        </div>
      </div>
      <PrinterSettings db={db} commit={commit} flash={flash} />
      <section className="panel channels-panel">
        <SectionHeading
          eyebrow="VENDAS"
          title="Canais e taxas"
          text="A taxa fixa é aplicada por lote vendido; a percentual incide sobre o preço final."
          action={
            <button type="button" className="button button-primary" onClick={openAddChannel}>
              <Plus aria-hidden="true" /> Adicionar canal
            </button>
          }
        />
        <div className="channel-list">
          {db.settings.channels.map((channel) => (
            <div className="channel-row" key={channel.id}>
              <div>
                <strong>{channel.name}</strong>
                <small>
                  Taxa fixa: {money(channel.fixedFee)} · Taxa percentual:{' '}
                  {number(channel.percentFee)}%
                </small>
              </div>
              <div className="settings-row-actions">
                <IconAction
                  icon={Pencil}
                  label={`Editar canal ${channel.name}`}
                  onClick={() => openEditChannel(channel)}
                />
                {channel.id !== 'direct' && (
                  <IconAction
                    icon={Trash2}
                    tone="pink"
                    label={`Remover canal ${channel.name}`}
                    onClick={() => {
                      const settings = {
                        ...db.settings,
                        channels: db.settings.channels.filter((c) => c.id !== channel.id),
                      }
                      commit({ ...db, settings }, 'Canal removido.')
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        {channelModalOpen && (
          <Modal
            title={editingChannelId ? 'Editar canal' : 'Adicionar canal'}
            eyebrow="CANAIS DE VENDA"
            onClose={() => setChannelModalOpen(false)}
          >
            <form className="form-grid" onSubmit={saveChannel}>
              <Field label="Nome do canal">
                <input
                  value={channelDraft.name}
                  onChange={(e) =>
                    setChannelDraft({
                      ...channelDraft,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ex.: Marketplace"
                  required
                />
              </Field>
              <Field label="Taxa fixa (R$)">
                <DecimalInput
                  min="0"
                  step="any"
                  value={channelDraft.fixedFee}
                  placeholder="Ex.: 5"
                  onValueChange={(value) =>
                    setChannelDraft({
                      ...channelDraft,
                      fixedFee: value ?? 0,
                    })
                  }
                />
              </Field>
              <Field label="Taxa percentual (%)">
                <DecimalInput
                  min="0"
                  max="99.99"
                  step="any"
                  value={channelDraft.percentFee}
                  placeholder="Ex.: 10"
                  onValueChange={(value) =>
                    setChannelDraft({
                      ...channelDraft,
                      percentFee: value ?? 0,
                    })
                  }
                />
              </Field>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setChannelModalOpen(false)}
                >
                  Cancelar
                </button>
                <button className="button button-primary" type="submit">
                  <Save aria-hidden="true" />{' '}
                  {editingChannelId ? 'Salvar alterações' : 'Cadastrar canal'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </section>
    </>
  )
}
