import React from "react";
import { Link } from "react-router-dom";
import { InView } from 'react-intersection-observer'
import { get, all, CancelToken, isCancel } from "axios";
import { matchPath } from 'react-router'
import pathToRegexp from 'path-to-regexp'

import styled from "styled-components";
import {
  Classes,
  Intent,
  Card,
  Tag,
  Slider,
  HTMLSelect,
  Tooltip,
  Popover,
  Menu,
  MenuItem,
  MenuDivider,
  Toaster,
  PopoverInteractionKind,
} from "@blueprintjs/core";
import copy from 'copy-to-clipboard'

import { OutputViewer } from "./OutputViewer";
import { MetricsTags } from "../components/metrics";
import { OutputTags, ExtraParametersTags, StatusTag, style_skeleton } from '../components/tags'

import { updateSelected } from "../actions/selected";
import { linux_to_windows } from '../utils'

export const toaster = Toaster.create();

// ES2018.....
Object.fromEntries = arr => Object.assign({}, ...Array.from(arr, ([k, v]) => ({ [k]: v })));

const on_copy = e => {
  const text = e.target.textContent
  copy(text)
  toaster.show({
    message: <span className={Classes.TEXT_OVERFLOW_ELLIPSIS}><strong>Copied:</strong> {text}</span>,
  });
}


const SlimCard = styled(Card)`
  padding: 5px !important;
  overflow: "auto";
`;



const OutputHeader = ({ project, commit, output, output_ref, type, dispatch, style, prefix, tags_first=false }) => {
  const has_metadata = !!output.test_input_metadata && (Object.keys(output.test_input_metadata).length > 0)
  const has_label = has_metadata && !!output.test_input_metadata.label
  const tags = <OutputTags
    output={output}
    output_ref={output_ref}
    warning={output.reference_warning}
    dispatch={dispatch}
    commit={commit}
    style={{marginLeft: '5px', marginRight: '5px'}}
  />

  const input_over_time_url = `/${project}/time-travel/${!!commit ? commit.branch : ''}${window.location.search}`
  return <>
    <h5 className={Classes.HEADING} style={style} >
      {prefix}   
      {tags_first && tags}
      <Popover hoverCloseDelay={1000} interactionKind={PopoverInteractionKind.HOVER}>
        <span>
          <Link
            to={input_over_time_url}
            onClick={() => {
                  // https://stackoverflow.com/a/6969486
                  const filter = output.test_input_path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  dispatch(updateSelected(project, {
                    branch: commit.branch,
                    filter_batch_new: filter,
                    filter_batch_ref: filter,
                  }, {
                    show_bit_accuracy: type === 'bit_accuracy',
                  }))
            }}
            style={{ color: 'inherit' }}
          >
            {has_label ? output.test_input_metadata.label : output.test_input_path}
          </Link>
        </span>
        <Menu>
          {!!output.test_input_database && <>
            <MenuDivider key={"Database"} title="Database" />
            <MenuItem key="database-linux" text={output.test_input_database} icon="duplicate" onClick={on_copy} />
            <MenuItem key="database-windows" text={linux_to_windows(output.test_input_database)} icon="duplicate" onClick={on_copy} />
          </>}
          {has_metadata && <>
            <MenuDivider key={"Properties"} title="Properties" />
            { has_label && <MenuItem text={output.test_input_path} icon="document" />}
            <MenuItem key="metadata" text="Metadata" icon="info-sign"> {/*tag, info-sign, annotation, more*/}
              <pre>{JSON.stringify(output.test_input_metadata, null, 2)}</pre>
            </MenuItem>
          </>}
        </Menu>
      </Popover>
      {!tags_first && tags}
    </h5>
    <p>
      <ExtraParametersTags parameters={output.extra_parameters} />
    </p>
  </>
}



const condensed_header_style = {
  fontSize: ".7rem",
  fontWeight: 500,
  lineHeight: 1.6,
  letterSpacing: "-1px",
};


class OutputCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // we delay fetching the output manifest and rendering the viewers
      // until the card comes into view
      viewable: false || props.viewable,
      // the output manifest lists all files created by the run
      manifests: {},
      is_loaded: false,
      error: {},
      cancel_source: {
        new: CancelToken.source(),
        reference: CancelToken.source(),
      },
      options: {
      }
    }
  }

  componentWillUnmount() {
    ["new", "reference"].forEach(label => {
      if (!!this.state.cancel_source[label])
        this.state.cancel_source[label].cancel();
    })
  }


  fetchData(label, update_manifest) {
    const { output_new, output_ref } = this.props;
    // console.log(output_new, output_ref)

    if (!output_new.output_dir_url) return;
    this.setState({ is_loaded: false })

    let results = [];
    const should_get_all = (label === undefined || label === null);
    if (should_get_all || label === 'new') {
      let url = (!output_new.is_running && !update_manifest) ? `${output_new.output_dir_url}/manifest.outputs.json` : `/api/v1/output/${output_new.id}/manifest/${update_manifest ? '?refresh=true': ''}`
      results.push(['new', url])
      if (output_new.is_running) {
        setTimeout(() => this.fetchData('new') , 30*1000)
      }
    }
    if (should_get_all || label === 'reference') {
      if (!!output_ref && !!output_ref.output_dir_url) {
        let url = (!output_ref.is_running && !update_manifest) ? `${output_ref.output_dir_url}/manifest.outputs.json` : `/api/v1/output/${output_ref.id}/manifest/`
        results.push(['reference', url])
        if (output_ref.is_running) {
          setTimeout(() => this.fetchData('reference') , 30*1000)
        }
      }
    }
    const load_data = label => (response, thrown) => {
      // The manifest is sometimes corrupted due to filesystem issues (?!?)
      // maybe it happens if we update the manifest during a running output while it ends...
      // https://github.com/axios/axios/issues/61
      // Then the best option is maybe to regenerate the manifest..
      if (typeof response.data === 'string') {
        this.fetchData(label, update_manifest=true)
        this.setState((previous_state, props) => ({
          error: {
            ...previous_state.error,
            [label]: 'Corrupt output manifest.',
          }
        }))  
        return;
      }
      // http://qa:3000/CDE-Users/HW_ALG/CIS/tests/products/RV1/commit/d4f44717870dc9593704aefcb353d6de77369f9d?batch=%40eliavm%7C%20default&selected_views=bit_accuracy
      this.setState((previous_state, props) => ({
        manifests: {
          ...previous_state.manifests,
          [label]: response.data,
        },
        error: {
          ...previous_state.error,
          [label]: thrown,
        }
      }))
    }

    all(results.map(([label, url]) => {
      return () => get(url, { cancelToken: this.state.cancel_source[label].token })
        .then(load_data(label))
        .catch(thrown => {
          if(!isCancel(thrown))
            load_data(label)(
              { load_data: {} },
              thrown,
            )
        });
    }).map(f => f()))
      // now we loaded and parsed all the data
      .then(() => {
        this.updateOptions()
      })
  }


  becameViewable = inView => {
    if (!inView) {
      return;
    }
    this.setState({viewable: true}, this.fetchData);
  }


  componentDidUpdate(prevProps, prevState) {
    if (!this.state.viewable)
      return;
    const has_new = this.props.output_new !== undefined && this.props.output_new !== null;
    const has_ref = this.props.output_ref !== undefined && this.props.output_ref !== null;
    let updated_new = has_new && (prevProps.output_new === null || prevProps.output_new === undefined || prevProps.output_new.id !== this.props.output_new.id || prevProps.output_new.is_running !== this.props.output_new.is_running);
    let updated_ref = has_ref && (prevProps.output_ref === null || prevProps.output_ref === undefined || prevProps.output_ref.id !== this.props.output_ref.id || prevProps.output_ref.is_running !== this.props.output_ref.is_running);
    if (updated_new) {
      if (!!this.state.cancel_source.new.token)
        this.state.cancel_source.new.cancel("Changed new output");
      this.fetchData('new');
    }
    if (updated_ref) {
      if (!!this.state.cancel_source.reference.token) {
        this.state.cancel_source.reference.cancel("Changed reference output");
        this.setState({
          cancel_source: {
            ...this.state.cancel_source,
           reference: CancelToken.source()
          }
        }, () => this.fetchData('reference'))
      }
    }
  }

  setSelectedOption = name => e => {
    const selected = !!e.target ? e.target.value : e;
    this.setState({
      options: {
        ...this.state.options,
        [name]: {
          ...this.state.options[name],
          selected: [selected],
        }
      }
    })
  }



  updateOptions() {
    if (this.state.manifests.new === undefined || this.state.manifests.new === null) {
      this.setState({
        is_loaded: true,
      })
      return;
    }

    const outputs = (((this.props.project_data || {}).data || {}).qatools_config || {}).outputs || {}
    const views = [...(outputs.visualizations || []), ...(outputs.detailed_views || [])]; // we allow both for some leeway with half updated projects
    // console.log(views)
    var options = {}
    views.forEach((view, idx) => {
      if (view.path === undefined) return
      // be glob-friendly
      // FIXME: also get the extension, that's the common case...
      // let path_regex = view.path.replace(/[^\.]\*/g, '(.*)')
      let view_options = pathToRegexp.parse(view.path)
      view_options.forEach(token => {
        // console.log(token)
        if (token.name === undefined) // static part
          return
        if (Number.isInteger(token.name)) {
          // we must not confuse unnamed group
          token.unnamed_group = token.name
          token.name = `${idx}-${token.name}`
        }
        if (options[token.name] === undefined)
          options[token.name] = { views: [], paths: [] }
        options[token.name] = { ...options[token.name], ...token }
        // if (!!token.path)
        //   options[token.name] = { ...options[token.name], ...token }
        options[token.name].views.push(view.name)
        options[token.name].paths.push(view.path)
      })
    })

    const paths = Object.keys(this.state.manifests.new)
    Object.entries(options).forEach(([name, option]) => {
      // console.log(name, option)
      option.values = new Set()
      paths.forEach(path => {
        // const match = option.match.exec(p);
        option.paths.forEach(option_path => {
          const match = matchPath(path, { path: option_path }) // they do their own caching
          // console.log('>', path, match)
          if (match === null || match === undefined) return;
          let name_ = option.unnamed_group !== undefined ? option.unnamed_group : name;
          option.values.add(match.params[name_])          
        })
      })
      option.values = Array.from(option.values.values()).sort( (a, b) => a.localeCompare(b) )
  
      const all_is_integer = option.values.length > 0 && option.values.every(v => Number.isInteger(Number(v)))
      const all_numbers = option.values.length > 0 && option.values.every(v => !isNaN(parseFloat(v)))
      // console.log(all_numbers)
      if (all_is_integer) {
        option.type = 'slider'
        option.to_raw = {}
        option.min = Infinity
        option.max = -Infinity
        option.values.forEach(v => {
          const v_num = parseFloat(v);
          if (v_num < option.min) option.min = v_num;
          if (v_num > option.max) option.max = v_num;
          option.to_raw[v_num] = v
        })
        option.selected = [option.max]
      } else {
        option.selected = [option.values[all_numbers ? option.values.length-1 : 0]]
      }
    })
    this.setState({
      options,
      is_loaded: true,
    })
  }


  render() {
    const { is_loaded, error } = this.state;
    const { output_new, output_ref } = this.props;

    const has_output_new = output_new !== undefined && output_new !== null
    if (!has_output_new || (output_new.is_pending && !output_new.is_running))
      return <span />

    const qatools_config = (((this.props.project_data || {}).data || {}) || {}).qatools_config;
    const style = {
      ...((qatools_config.outputs || {}).style || {}),
      ...this.props.style,
    }


    var content;
    if (!is_loaded && !has_output_new) {
      content = <span />;
    } else {
      const { main_metrics, available_metrics } = ((this.props.project_data || {}).data || {}).qatools_metrics || {};
      var controls = this.props.controls || {};

      // layout should be plotly-like. You could also pass down a props named style.
      var views = [...((qatools_config.outputs || {}).visualizations || []), ...((qatools_config.outputs || {}).detailed_views || [])]; // we allow both for some leeway with half updated projects

      // we display the input for each option before the first visualization that uses it
      let already_shown_options = {}

      let viewers = views.map((view, idx) => {
        let hidden = view.default_hidden === true && !(!!controls.show && controls.show[view.name] === true)
        if (hidden)
          return <span key={idx} />

        const view_options = Object.values(this.state.options).filter(option => option.views.includes(view.name))
        if (view_options.some(o => o.selected[0] === undefined || o.selected[0] === null))
          return <span key={idx} />

        const new_options = view_options.filter(({name}) => already_shown_options[name] === undefined)
        new_options.forEach(option => already_shown_options[option.name] = option)
        const options = new_options.map( (option, idx) => {
          let option_idx = `option-${idx}`;
          const option_label = isNaN(option.name) ? option.name : option.pattern
          if (option.views.every(name => (views.find(v => v.name === name) || {}).default_hidden === true && !(!!controls.show && controls.show[name] === true)))
            return <span key={option_idx} />
          if (option.type === 'slider') {
            // let labelStepSize = (option.max - option.min) / 10
            let labelStepSize = Math.pow(10, Math.floor(Math.log10(option.max - option.min)))
            return <div key={option_idx} title={option_label} style={{ marginLeft: '5px', marginRight: '5px', paddingLeft: '5px', paddingRight: '5px' }}>
              <Slider key={option_idx} initialValue={option.selected[0]} value={option.selected[0]} min={option.min} max={option.max} labelStepSize={labelStepSize} onChange={this.setSelectedOption(option.name)} showTrackFill />
            </div>
          } else {
            return <div key={option_idx} title={option_label}>{option.values.length > 0 && <HTMLSelect disabled={option.values.length===1} options={option.values} value={option.selected[0]} onChange={this.setSelectedOption(option.name)} />}</div>
          }
        })

        if (!(view.display === 'viewer') && view_options.length > 0) {
          if (view.display === undefined || view.display === 'single') {
            const view_options_selected = view_options.map(o => [o.unnamed_group !== undefined ? o.unnamed_group : o.name, o.to_raw ? o.to_raw[o.selected[0]] : o.selected[0]])
            var paths = [compilePath(view.path)(Object.fromEntries(view_options_selected))]
          } else if (view.display === 'all') {
            paths = Object.keys(this.state.manifests.new).filter(path => matchPath(path, { path: view.path }))
          }
        } else {
          // some viewers are tightly coupled to a project and don't define a "path"
          let necessary_files_exist = view.path === undefined || (!!this.state.manifests.new && !!this.state.manifests.new[view.path]);
          paths = necessary_files_exist ? [view.path] : []
        }
        // console.log(view.display, paths)

        let show_ref_if_available = controls.show_reference === undefined || controls.show_reference
        const viewers = paths.map(
          (path, path_idx) => {
            let ref_available = path === undefined || (!!this.state.manifests.reference && !!this.state.manifests.reference[path])
            return <div key={`${idx}-${path_idx}`} id={`${idx}-${path_idx}`}>
              {paths.length > 1 && <h3 style={{ marginBottom: '0px' }}>{path}</h3>}
              <OutputViewer
                key={`${idx}-${path_idx}`}
                id={`${idx}-${path_idx}`}
                output_new={output_new}
                output_ref={(ref_available && show_ref_if_available) ? output_ref : undefined}
                manifests={this.state.manifests}
                {...view}
                path={path}
                {...controls}
                style={{ ...style, ...view.style }}
                qatools_config={qatools_config}
              />
          </div>})
        return <>
          {options}
          {viewers}
        </>
      })

      if (this.props.type === 'bit_accuracy') {
        content = <OutputViewer
          key="bit-accuracy"
          type="files/bit-accuracy"
          {...controls}
          controls={controls}
          output_new={output_new}
          output_ref={output_ref}
          manifests={this.state.manifests}
          style={style}
          show_all_files={this.props.show_all_files}
          expand_all={this.props.expand_all}
          files_filter={this.props.files_filter}
        />
      } else {
        content = <>
          {!output_new.is_failed && <MetricsTags
            key="content"
            selected_metrics={main_metrics}
            available_metrics={available_metrics}
            metrics_new={output_new.metrics ? output_new.metrics : {}}
            metrics_ref={output_ref && output_ref.metrics ? output_ref.metrics : {}}
          />}
          {viewers}
        </>
      }
    }


    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
    // https://www.npmjs.com/package/react-intersection-observer

    let container_style = {
      flex: "0 0 auto",
      width: style.width || '840px',
      marginBottom: "20px"
    }
    const maybe_style_skeleton = output_new.is_running ? style_skeleton : {};
    // console.log(content)
    // console.log(this.state.manifests)

    return <div style={container_style}>
      <SlimCard className="output-card" style={maybe_style_skeleton}>
        {error.new && <Tooltip key="error-new"><Tag style={{ margin: '5px' }} intent={Intent.DANGER}>Download error @new</Tag><span dangerouslySetInnerHTML={{ __html: !!error.new.response ? error.new.response.data : error.new }} /></Tooltip>}
        {error.reference && <Tooltip key="error-ref"><Tag style={{ margin: '5px' }} intent={Intent.DANGER}>Download error @reference</Tag><span dangerouslySetInnerHTML={{ __html: !!error.reference.response ? error.reference.response.data : error.reference }} /></Tooltip>}

        {!this.props.no_header && <OutputHeader
          project={this.props.project}
          commit={this.props.commit}
          output={output_new}
          output_ref={output_ref}
          type={this.props.type}
          dispatch={this.props.dispatch}
          style={condensed_header_style}
          prefix={output_new.is_running && <StatusTag output={output_new} style={{ marginRight: '5px' }}/>}
        />}
        {output_new.is_failed && <Tag key="new-failed" intent={Intent.DANGER}>Failed</Tag>}
        {output_ref && output_ref.is_failed && <Tag key="ref-failed" intent={Intent.WARNING}>Reference Failed</Tag>}
        {output_new.deleted && <Tag key="new-deleted" intent={Intent.DANGER}>Deleted</Tag>}
        {output_ref && output_ref.deleted && <Tag key="ref-deleted" intent={Intent.WARNING}>Reference deleted</Tag>}

        {!this.state.viewable && <InView key="unviewable" threshold={0.1} margin='150%' /*triggerOnce*/ onChange={inView => this.becameViewable(inView)}>
          <span key="viewable"></span>
        </InView>}
        {(is_loaded || has_output_new) && content}
      </SlimCard>
    </div>
  }
}



// Adapted from
// https://github.com/ReactTraining/react-router/blob/82ce94c3b4e74f71018d104df6dc999801fa9ab2/packages/react-router/modules/matchPath.js
const cache = {};
const cacheLimit = 10000;
let cacheCount = 0;
function compilePath(path) {
  if (cache[path]) return cache[path];
  const regexp = pathToRegexp.compile(path);
  if (cacheCount < cacheLimit) {
    cache[path] = regexp;
    cacheCount++;
  }
  return regexp;
}


export { OutputCard, OutputHeader };
